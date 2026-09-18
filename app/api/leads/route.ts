import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0'), 0);

    // Pull assessments newest-first, joined with any bookings
    const { data: assessments, error: aErr, count } = await supabase
        .from('assessments')
        .select(
            `
      id,
      created_at,
      triage_level,
      user_email,
      bookings (
        id,
        name,
        phone,
        email,
        status,
        preferred_clinic,
        created_at
      )
    `,
            { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (aErr) {
        console.error('[leads] query failed:', aErr.message);
        return NextResponse.json(
            { error: 'Failed to fetch leads.', detail: aErr.message },
            { status: 500 }
        );
    }

    const leads = (assessments ?? []).map((a) => {
        const booking = Array.isArray(a.bookings) ? a.bookings[0] ?? null : null;
        return {
            assessmentId: a.id,
            createdAt: a.created_at,
            triageLevel: a.triage_level,
            email: a.user_email,
            booking: booking
                ? {
                    id: booking.id,
                    name: booking.name,
                    phone: booking.phone,
                    email: booking.email,
                    status: booking.status,
                    preferredClinic: booking.preferred_clinic,
                    createdAt: booking.created_at,
                }
                : null,
        };
    });

    return NextResponse.json({
        leads,
        total: count ?? leads.length,
        limit,
        offset,
    });
}