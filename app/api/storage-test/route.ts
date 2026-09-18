import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: Record<string, string> = {};

  // Test 1: Can we read the tables?
  try {
    const { error: aErr } = await supabase
      .from('assessments')
      .select('id')
      .limit(1);
    results.table_assessments = aErr ? `failed: ${aErr.message}` : 'reachable';
  } catch (e) {
    results.table_assessments = `failed: ${(e as Error).message}`;
  }

  try {
    const { error: iErr } = await supabase
      .from('images')
      .select('id')
      .limit(1);
    results.table_images = iErr ? `failed: ${iErr.message}` : 'reachable';
  } catch (e) {
    results.table_images = `failed: ${(e as Error).message}`;
  }

  // Test 2: Can we upload to the bucket?
  try {
    const testContent = Buffer.from('hello caresmile');
    const testPath = `_smoketest/hello.txt`;

    const { error: uploadErr } = await supabase.storage
      .from('oral-scans')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadErr) {
      results.storage_upload = `failed: ${uploadErr.message}`;
    } else {
      results.storage_upload = 'success';

      // Cleanup: delete the test file
      await supabase.storage.from('oral-scans').remove([testPath]);
    }
  } catch (e) {
    results.storage_upload = `failed: ${(e as Error).message}`;
  }

  return NextResponse.json(results);
}