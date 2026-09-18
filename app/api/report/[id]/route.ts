import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(id)) {
        return NextResponse.json(
            { error: 'Invalid assessment ID format.' },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from('assessments')
        .select('id, user_email, created_at, triage_level, report_json')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error(`[report] fetch failed for ${id}:`, error.message);
        return NextResponse.json(
            { error: 'Failed to fetch report.' },
            { status: 500 }
        );
    }

    if (!data) {
        return NextResponse.json(
            { error: 'Report not found.' },
            { status: 404 }
        );
    }

    // Fetch the storage paths for this assessment's photos
    const { data: imageRows } = await supabase
        .from('images')
        .select('angle, storage_path')
        .eq('assessment_id', id);

    // Generate signed URLs (1 hour expiry)
    const photos: { angle: string; url: string }[] = [];
    if (imageRows?.length) {
        for (const row of imageRows) {
            const { data: signed } = await supabase.storage
                .from('oral-scans')
                .createSignedUrl(row.storage_path, 3600);
            if (signed?.signedUrl) {
                photos.push({ angle: row.angle, url: signed.signedUrl });
            }
        }
    }

    return NextResponse.json({
        assessmentId: data.id,
        email: data.user_email,
        createdAt: data.created_at,
        triageLevel: data.triage_level,
        summary: data.report_json?.summary ?? null,
        findings: data.report_json?.findings ?? [],
        alert: data.report_json?.alert ?? null,
        disclaimer: data.report_json?.disclaimer ?? null,
        imagesAnalyzed: data.report_json?.images_analyzed ?? 0,
        imagesSkipped: data.report_json?.images_skipped ?? 0,
        photos,
    });
}