// lib/screening.ts
// Pure logic: prompt, aggregation, guardrails. No I/O.

export const SCREENING_PROMPT = `You are a dental screening assistant analyzing a single oral photograph. Your job is to identify visible signs of common dental concerns.

Look for these categories of findings:
- discoloration: staining or color changes on tooth surfaces
- crowding: teeth overlapping or rotated
- spacing: visible gaps between teeth
- wear: flattened, eroded, or shortened tooth surfaces
- chip: fractured or chipped edges
- gum_inflammation: redness, swelling, or recession of gums
- plaque: visible soft deposits near gumline
- tartar: hardened yellow/calcified deposits
- dark_spot: dark areas on tooth surfaces that warrant evaluation
- missing_tooth: visibly absent teeth

For each finding, report:
- type: one of the categories above (exact lowercase string)
- location: which teeth/area (e.g., "upper anterior", "lower left molar")
- severity: "mild" | "moderate" | "severe"
- confidence: number between 0.0 and 1.0
- evidence: short description of what you observed
- bounding_box: [ymin, xmin, ymax, xmax] normalized to 0-1000

Also report image_quality:
- score: number between 0.0 and 1.0
- issues: array of strings from ["blurry", "dark", "glare", "partial_view", "no_teeth_visible"]

IMPORTANT RULES:
- Do NOT diagnose. Describe visible signs only.
- Do NOT use the words "cavity", "caries", or "disease" as a diagnosis. Use descriptive terms like "dark spot" or "discoloration".
- If the image is unusable (too blurry, wrong angle, no teeth visible), return an empty findings array and note the issue in image_quality.issues.
- Return ONLY the JSON object, no other text, no markdown fences.

Required JSON structure:
{
  "image_quality": { "score": number, "issues": string[] },
  "findings": [
    {
      "type": string,
      "location": string,
      "severity": "mild" | "moderate" | "severe",
      "confidence": number,
      "evidence": string,
      "bounding_box": [number, number, number, number]
    }
  ]
}`;

// ---------- Types ----------

export type FindingType =
  | 'discoloration'
  | 'crowding'
  | 'spacing'
  | 'wear'
  | 'chip'
  | 'gum_inflammation'
  | 'plaque'
  | 'tartar'
  | 'dark_spot'
  | 'missing_tooth';

export type Severity = 'mild' | 'moderate' | 'severe';

export interface RawFinding {
  type: FindingType;
  location: string;
  severity: Severity;
  confidence: number;
  evidence: string;
  bounding_box: [number, number, number, number];
}

export interface ImageAnalysis {
  image_quality: { score: number; issues: string[] };
  findings: RawFinding[];
}

export interface AggregatedFinding extends RawFinding {
  angle: string; // which photo it came from
}

export interface ScreeningReport {
  triage_level: 'routine' | 'soon' | 'urgent';
  summary: string;
  findings: AggregatedFinding[];
  alert: string | null;
  disclaimer: string;
  images_analyzed: number;
  images_skipped: number;
}

// ---------- Aggregation ----------

/**
 * Combines findings from multiple images. Deduplicates by (type + location).
 * When duplicates exist, keeps the highest-confidence one.
 */
export function aggregateFindings(
  perImage: { angle: string; analysis: ImageAnalysis }[]
): { findings: AggregatedFinding[]; images_analyzed: number; images_skipped: number } {
  const seen = new Map<string, AggregatedFinding>();
  let images_analyzed = 0;
  let images_skipped = 0;

  for (const { angle, analysis } of perImage) {
    if (analysis.image_quality.score < 0.4) {
      images_skipped++;
      continue;
    }
    images_analyzed++;

    for (const f of analysis.findings) {
      const key = `${f.type}::${f.location.toLowerCase().trim()}`;
      const candidate: AggregatedFinding = { ...f, angle };
      const existing = seen.get(key);
      if (!existing || candidate.confidence > existing.confidence) {
        seen.set(key, candidate);
      }
    }
  }

  // Sort by severity desc, then confidence desc
  const severityRank: Record<Severity, number> = { severe: 3, moderate: 2, mild: 1 };
  const findings = Array.from(seen.values()).sort((a, b) => {
    const s = severityRank[b.severity] - severityRank[a.severity];
    return s !== 0 ? s : b.confidence - a.confidence;
  });

  return { findings, images_analyzed, images_skipped };
}

// ---------- Guardrails ----------

const DISCLAIMER =
  'This is a screening tool, not a diagnosis. Please consult a dentist for a confirmed evaluation.';

// Acute keywords = truly urgent regardless of severity
const ACUTE_KEYWORDS = ['abscess', 'pus', 'severe pain', 'trauma', 'facial swelling'];
// Concern keywords = urgent only when finding is moderate or severe
const CONCERN_KEYWORDS = ['bleeding', 'swelling', 'receding', 'exposed'];

/**
 * Applies safety rules and produces a final report.
 * Rule summary:
 *  - 2+ severe findings, or an acute keyword (abscess, pus, severe pain, trauma, facial swelling) → "urgent"
 *  - 1 severe finding, OR confidence >= 0.85, OR moderate+ dark spot,
 *    OR a concern keyword (bleeding, swelling, receding, exposed) on a non-mild finding → "soon"
 *  - Otherwise → "routine"
 */
export function buildReport(
  aggregated: AggregatedFinding[],
  images_analyzed: number,
  images_skipped: number
): ScreeningReport {
  let triage: ScreeningReport['triage_level'] = 'routine';
  let alert: string | null = null;

  const severeCount = aggregated.filter((f) => f.severity === 'severe').length;
  const hasAcuteKeyword = aggregated.some((f) =>
    ACUTE_KEYWORDS.some((kw) => f.evidence.toLowerCase().includes(kw))
  );
  const hasConcernKeyword = aggregated.some(
    (f) =>
      f.severity !== 'mild' &&
      CONCERN_KEYWORDS.some((kw) => f.evidence.toLowerCase().includes(kw))
  );
  const hasHighConfidence = aggregated.some((f) => f.confidence >= 0.85);
  const hasModerateDarkSpot = aggregated.some(
    (f) => f.type === 'dark_spot' && f.severity !== 'mild'
  );

  if (severeCount >= 2 || hasAcuteKeyword) {
    triage = 'urgent';
    alert =
      'If you are experiencing pain, bleeding, or swelling, please seek immediate dental care.';
  } else if (
    severeCount >= 1 ||
    hasHighConfidence ||
    hasModerateDarkSpot ||
    hasConcernKeyword
  ) {
    triage = 'soon';
  }

  const summary = generateSummary(aggregated, triage);

  return {
    triage_level: triage,
    summary,
    findings: aggregated,
    alert,
    disclaimer: DISCLAIMER,
    images_analyzed,
    images_skipped,
  };
}

function generateSummary(findings: AggregatedFinding[], triage: string): string {
  if (findings.length === 0) {
    return 'No obvious visible concerns were detected in the images provided. Keep up regular brushing, flossing, and routine dental check-ups.';
  }

  const rawTypes = Array.from(new Set(findings.map((f) => f.type)));
  const firstFew = rawTypes
    .slice(0, 3)
    .map((t) => t.replace(/_/g, ' '))
    .join(', ');

  if (triage === 'urgent') {
    return `The screening detected signs that may need prompt attention, including ${firstFew}. Please consider consulting a dentist soon.`;
  }

  if (triage === 'soon') {
    return `The screening detected visible signs such as ${firstFew} that may benefit from a dentist's evaluation. Booking a routine consultation is recommended.`;
  }

  // Routine: tailor the advice to what was actually found.
  // Hygiene-related findings (staining, deposits, gum inflammation) can often
  // be managed with home care. Structural findings (crowding, wear, chips,
  // spacing, missing teeth) usually need a professional opinion.
  const HYGIENE_TYPES = new Set([
    'discoloration',
    'plaque',
    'tartar',
    'gum_inflammation',
  ]);
  const allHygiene = rawTypes.every((t) => HYGIENE_TYPES.has(t));

  if (allHygiene) {
    return `The screening detected minor visible signs (${firstFew}). These are typically addressed with routine care and good oral hygiene.`;
  }

  return `The screening detected minor visible signs (${firstFew}). A routine dental check-up is the best next step to keep an eye on these.`;
}