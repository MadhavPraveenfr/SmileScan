import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Body must be valid JSON.' },
      { status: 400 }
    );
  }

  const assessmentId = typeof body.assessmentId === 'string' ? body.assessmentId.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : null;
  const preferredClinic = typeof body.preferredClinic === 'string' ? body.preferredClinic.trim() : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

  const fieldErrors: Record<string, string> = {};
  if (!uuidRe.test(assessmentId)) fieldErrors.assessmentId = 'Invalid or missing assessment ID.';
  if (name.length < 2) fieldErrors.name = 'Name is required (min 2 characters).';
  if (phone.replace(/\D/g, '').length < 10) fieldErrors.phone = 'Phone must have at least 10 digits.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Email format is invalid.';

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: 'Validation failed.', fields: fieldErrors }, { status: 400 });
  }

  const { data: assessment, error: assessmentErr } = await supabase
    .from('assessments')
    .select('id, triage_level')
    .eq('id', assessmentId)
    .maybeSingle();

  if (assessmentErr) {
    console.error('[book] assessment lookup failed:', assessmentErr.message);
    return NextResponse.json({ error: 'Failed to verify assessment.' }, { status: 500 });
  }
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
  }

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      assessment_id: assessmentId,
      name,
      phone,
      email,
      preferred_clinic: preferredClinic,
      notes,
    })
    .select('id, status, created_at')
    .single();

  if (bookingErr || !booking) {
    console.error('[book] insert failed:', bookingErr?.message);
    return NextResponse.json({ error: 'Failed to create booking.' }, { status: 500 });
  }

  console.log(
    `[book] ${booking.id} assessment=${assessmentId} triage=${assessment.triage_level} name="${name}" phone="${phone.slice(0, 4)}****"`
  );

  return NextResponse.json({
    bookingId: booking.id,
    status: booking.status,
    createdAt: booking.created_at,
    assessmentId,
    message: 'Your consultation request has been received. A clinic will reach out shortly.',
  });
}