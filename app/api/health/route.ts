import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const checks: Record<string, string> = {};

  // Supabase
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await supabase.auth.getSession();
    checks.supabase = error ? `failed: ${error.message}` : 'connected';
  } catch (e) {
    checks.supabase = `failed: ${(e as Error).message}`;
  }

  // Agnes AI — send a trivial prompt to confirm the key works
  try {
    const response = await fetch(
      'https://apihub.agnes-ai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AGNES_API_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'agnes-2.5-flash',
          messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
        }),
      }
    );
    if (!response.ok) {
      checks.agnes = `failed: HTTP ${response.status}`;
    } else {
      const json = await response.json();
      checks.agnes = json.choices?.[0]?.message?.content?.trim() ?? 'ok';
    }
  } catch (e) {
    checks.agnes = `failed: ${(e as Error).message}`;
  }

  return NextResponse.json(checks);
}