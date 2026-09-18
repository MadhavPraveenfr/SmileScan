import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

export async function GET() {
  const checks: Record<string, string> = {};

  // Check Supabase
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

  // Check Gemini (new SDK)
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Reply with exactly: ok',
    });
    checks.gemini = response.text?.trim() ?? 'no response text';
  } catch (e) {
    checks.gemini = `failed: ${(e as Error).message}`;
  }

  return NextResponse.json(checks);
}