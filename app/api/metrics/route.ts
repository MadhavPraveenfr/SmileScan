import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // -------- Assessments --------
    const { data: assessments, error: aErr } = await supabase
      .from('assessments')
      .select('id, triage_level, created_at');

    if (aErr) throw new Error(`assessments: ${aErr.message}`);

    const totalAssessments = assessments?.length ?? 0;
    const byTriage = { routine: 0, soon: 0, urgent: 0 };
    for (const a of assessments ?? []) {
      if (a.triage_level === 'routine') byTriage.routine++;
      else if (a.triage_level === 'soon') byTriage.soon++;
      else if (a.triage_level === 'urgent') byTriage.urgent++;
    }

    // -------- Bookings --------
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('id, status, assessment_id, created_at');

    if (bErr) throw new Error(`bookings: ${bErr.message}`);

    const totalBookings = bookings?.length ?? 0;
    const byStatus = { pending: 0, contacted: 0, scheduled: 0, cancelled: 0 };
    for (const b of bookings ?? []) {
      if (b.status in byStatus) byStatus[b.status as keyof typeof byStatus]++;
    }

    // -------- Conversion --------
    const bookingRate = totalAssessments > 0
      ? Number((totalBookings / totalAssessments).toFixed(3))
      : 0;

    // Bookings grouped by the triage level of their assessment
    const assessmentById = new Map(
      (assessments ?? []).map((a) => [a.id, a.triage_level])
    );

    const bookingsByTriage = { routine: 0, soon: 0, urgent: 0 };
    for (const b of bookings ?? []) {
      const t = assessmentById.get(b.assessment_id);
      if (t === 'routine') bookingsByTriage.routine++;
      else if (t === 'soon') bookingsByTriage.soon++;
      else if (t === 'urgent') bookingsByTriage.urgent++;
    }

    const bookingRateByTriage = {
      routine: byTriage.routine > 0
        ? Number((bookingsByTriage.routine / byTriage.routine).toFixed(3))
        : 0,
      soon: byTriage.soon > 0
        ? Number((bookingsByTriage.soon / byTriage.soon).toFixed(3))
        : 0,
      urgent: byTriage.urgent > 0
        ? Number((bookingsByTriage.urgent / byTriage.urgent).toFixed(3))
        : 0,
    };

    // -------- Cache stats --------
    const { count: uniqueImages } = await supabase
      .from('analysis_cache')
      .select('*', { count: 'exact', head: true });

    const { count: totalImages } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true });

    const uniqueCount = uniqueImages ?? 0;
    const totalCount = totalImages ?? 0;
    const cacheHitRate = totalCount > 0
      ? Number((1 - uniqueCount / totalCount).toFixed(3))
      : 0;

    // -------- Recent activity --------
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const last24hAssessments = (assessments ?? []).filter(
      (a) => a.created_at > cutoff
    ).length;
    const last24hBookings = (bookings ?? []).filter(
      (b) => b.created_at > cutoff
    ).length;

    // -------- Response --------
    return NextResponse.json({
      assessments: {
        total: totalAssessments,
        byTriage,
      },
      bookings: {
        total: totalBookings,
        byStatus,
      },
      conversion: {
        bookingRate,
        bookingRateByTriage,
      },
      cache: {
        uniqueImagesAnalyzed: uniqueCount,
        totalAnalyses: totalCount,
        cacheHitRate,
      },
      recent: {
        last24hAssessments,
        last24hBookings,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[metrics] failed:', (e as Error).message);
    return NextResponse.json(
      { error: 'Failed to compute metrics.', detail: (e as Error).message },
      { status: 500 }
    );
  }
}