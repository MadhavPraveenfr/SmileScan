import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!uuidRe.test(id)) {
        return NextResponse.json(
            { error: 'Invalid assessment ID format.' },
            { status: 400 }
        );
    }

    const { data: assessment, error: aErr } = await supabase
        .from('assessments')
        .select('id')
        .eq('id', id)
        .maybeSingle();

    if (aErr) {
        console.error('[purge] lookup failed:', aErr.message);
        return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
    }

    if (!assessment) {
        return NextResponse.json(
            { error: 'Assessment not found.' },
            { status: 404 }
        );
    }

    const { data: imageRows, error: iErr } = await supabase
        .from('images')
        .select('id, storage_path')
        .eq('assessment_id', id);

    if (iErr) {
        console.error('[purge] images lookup failed:', iErr.message);
        return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
    }

    if (imageRows?.length) {
        const paths = imageRows.map((r) => r.storage_path).filter(Boolean);
        if (paths.length > 0) {
            const { error: delErr } = await supabase.storage
                .from('oral-scans')
                .remove(paths);
            if (delErr) {
                console.error('[purge] storage delete failed:', delErr.message);
            }
        }
    }

    const { error: updErr } = await supabase
        .from('images')
        .update({ storage_path: null })
        .eq('assessment_id', id);

    if (updErr) {
        console.error('[purge] update failed:', updErr.message);
        return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
    }

    console.log(`[purge] deleted photos for assessment=${id}`);

    return NextResponse.json({
        assessmentId: id,
        deleted: true,
        message: 'Photos deleted. Your report remains available.',
    });
}