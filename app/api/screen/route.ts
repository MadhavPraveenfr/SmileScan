import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import {
  SCREENING_PROMPT,
  aggregateFindings,
  buildReport,
  type ImageAnalysis,
} from '@/lib/screening';

const REQUIRED_ANGLES = [
  'front-smile',
  'upper-arch',
  'lower-arch',
  'left-bite',
  'right-bite',
] as const;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_LONG_EDGE = 1024;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`[screen:${requestId}] start`);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected multipart/form-data.' },
      { status: 400 }
    );
  }

  const email = (formData.get('email') as string | null)?.trim() || null;
  const filesByAngle: Record<string, File> = {};

  for (const angle of REQUIRED_ANGLES) {
    const f = formData.get(angle);
    if (!(f instanceof File)) {
      return NextResponse.json(
        { error: `Missing image for angle: ${angle}` },
        { status: 400 }
      );
    }
    if (f.size === 0) {
      return NextResponse.json(
        { error: `Empty file for angle: ${angle}` },
        { status: 400 }
      );
    }
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large for angle: ${angle} (max 10 MB)` },
        { status: 400 }
      );
    }
    if (!f.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `Non-image file for angle: ${angle}` },
        { status: 400 }
      );
    }
    filesByAngle[angle] = f;
  }

  const { data: assessmentRow, error: assessmentErr } = await supabase
    .from('assessments')
    .insert({ user_email: email })
    .select('id')
    .single();

  if (assessmentErr || !assessmentRow) {
    console.error(`[screen:${requestId}] assessment insert failed`, assessmentErr);
    return NextResponse.json(
      { error: 'Failed to initialize assessment.' },
      { status: 500 }
    );
  }

  const assessmentId: string = assessmentRow.id;
  console.log(`[screen:${requestId}] assessment=${assessmentId}`);

  const perImage: { angle: string; analysis: ImageAnalysis }[] = [];
  const errors: string[] = [];

  for (let i = 0; i < REQUIRED_ANGLES.length; i++) {
    const angle = REQUIRED_ANGLES[i];
    const file = filesByAngle[angle];
    try {
      const inputBuffer = Buffer.from(await file.arrayBuffer());

      const processed = await sharp(inputBuffer)
        .rotate()
        .resize(MAX_LONG_EDGE, MAX_LONG_EDGE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();

      const storagePath = `${assessmentId}/${angle}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('oral-scans')
        .upload(storagePath, processed, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadErr) throw new Error(`upload: ${uploadErr.message}`);

      const { error: imageRowErr } = await supabase.from('images').insert({
        assessment_id: assessmentId,
        angle,
        storage_path: storagePath,
        quality_score: null,
      });
      if (imageRowErr) throw new Error(`image row: ${imageRowErr.message}`);

      const analysis = await analyzeImageWithRetry(processed, angle);
      perImage.push({ angle, analysis });

      await supabase
        .from('images')
        .update({ quality_score: analysis.image_quality.score })
        .eq('assessment_id', assessmentId)
        .eq('angle', angle);

      console.log(
        `[screen:${requestId}] ${angle}: ${analysis.findings.length} findings, quality=${analysis.image_quality.score.toFixed(2)}`
      );

      if (i < REQUIRED_ANGLES.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (e) {
      const msg = (e as Error).message;
      console.error(`[screen:${requestId}] ${angle} failed: ${msg}`);
      errors.push(`${angle}: ${msg}`);
    }
  }

  if (perImage.length === 0) {
    return NextResponse.json(
      { error: 'All image analyses failed.', details: errors },
      { status: 500 }
    );
  }

  const { findings, images_analyzed, images_skipped } = aggregateFindings(perImage);
  const report = buildReport(findings, images_analyzed, images_skipped);

  const { error: updateErr } = await supabase
    .from('assessments')
    .update({
      triage_level: report.triage_level,
      report_json: report,
    })
    .eq('id', assessmentId);

  if (updateErr) {
    console.error(`[screen:${requestId}] report update failed`, updateErr);
  }

  console.log(
    `[screen:${requestId}] done triage=${report.triage_level} findings=${findings.length}`
  );

  return NextResponse.json({
    assessmentId,
    triageLevel: report.triage_level,
    summary: report.summary,
    findings: report.findings,
    alert: report.alert,
    disclaimer: report.disclaimer,
    imagesAnalyzed: report.images_analyzed,
    imagesSkipped: report.images_skipped,
    warnings: errors.length > 0 ? errors : undefined,
  });
}

async function analyzeImageWithRetry(
  imageBuffer: Buffer,
  angle: string,
  maxRetries = 3
): Promise<ImageAnalysis> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await analyzeImage(imageBuffer, angle);
    } catch (e) {
      lastError = e as Error;
      const msg = lastError.message;

      const isRetryable = /503|UNAVAILABLE|overloaded|rate.?limit|429|deadline/i.test(msg);
      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError;
      }

      const is429 = /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
      const delayMs = is429 ? 15000 : 1000 * Math.pow(2, attempt);

      console.log(
        `[screen] ${angle} attempt ${attempt + 1}/${maxRetries} failed: ${msg.slice(0, 100)} — retrying in ${delayMs}ms`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastError ?? new Error('analyzeImageWithRetry: unreachable');
}

async function analyzeImage(
  imageBuffer: Buffer,
  angle: string
): Promise<ImageAnalysis> {
  const hash = createHash('sha256').update(imageBuffer).digest('hex');

  const { data: cached } = await supabase
    .from('analysis_cache')
    .select('analysis_json, model')
    .eq('image_hash', hash)
    .maybeSingle();

  if (cached?.analysis_json) {
    console.log(`[screen] ${angle}: CACHE HIT (${cached.model})`);
    return cached.analysis_json as ImageAnalysis;
  }

  console.log(`[screen] ${angle}: CACHE MISS — calling Agnes`);

  const MODEL = 'agnes-2.5-flash';
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const response = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AGNES_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Photo angle: ${angle}\n\n${SCREENING_PROMPT}` },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Agnes API error ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content ?? '';
  const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();

  let parsed: ImageAnalysis;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Agnes returned non-JSON: ${cleaned.slice(0, 120)}`);
  }

  if (!parsed.image_quality) {
    parsed.image_quality = { score: 0.5, issues: ['parse_incomplete'] };
  }
  if (!Array.isArray(parsed.findings)) {
    parsed.findings = [];
  }

  await supabase
    .from('analysis_cache')
    .upsert(
      {
        image_hash: hash,
        angle,
        model: MODEL,
        analysis_json: parsed,
      },
      { onConflict: 'image_hash' }
    )
    .then(({ error }) => {
      if (error) console.error(`[screen] cache write failed: ${error.message}`);
    });

  return parsed;
}