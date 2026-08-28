'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { AQ_MODELS, type AqModelId, AQ_THINKING } from '@/lib/aiModels';

const DEFAULT_MODEL: AqModelId = AQ_MODELS[0].id;

// Pasted text (recruiter DM, LinkedIn repost, notes) has no reliable
// structure to regex against — no numbering is guaranteed — so an LLM reads
// it like a person would and pulls out each distinct interview question,
// dropping commentary/preamble. Gated behind sign-in like the other AI
// actions (generateQuestion, suggestPlacement, …), unlike plain capture.
export async function splitInboxText(
  text: string,
  model?: string,
): Promise<string[]> {
  await requireAuthor('Sign in to use AI split');

  const apiKey = process.env.FREE_GEM_API_KEY;
  if (!apiKey) throw new Error('AI generation is not configured');

  const trimmed = text.trim();
  if (trimmed.length < 4) throw new Error('Write a bit more before splitting');

  const chosenModel = AQ_MODELS.some((m) => m.id === model)
    ? (model as AqModelId)
    : DEFAULT_MODEL;

  const systemInstruction = [
    'You extract individual interview questions from a pasted block of text (often a LinkedIn post, recruiter email, or notes).',
    'Respond with ONLY minified JSON: an array of strings, one per distinct question, in the original wording.',
    'Ignore commentary, intros, and sign-offs.',
    'If the whole text is a single question, return an array with one string.',
  ].join(' ');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: trimmed }] }],
        generationConfig: {
          thinkingConfig: AQ_THINKING,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      body?.error?.message || 'Could not split that — try again.',
    );
  }

  const raw = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Could not split that — try again.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim().replace(/^```(json)?\s*|```\s*$/g, ''));
  } catch {
    throw new Error('Could not read the split result — try again.');
  }
  if (!Array.isArray(parsed))
    throw new Error('Could not read the split result — try again.');

  const questions = parsed.map((s) => String(s).trim()).filter(Boolean);
  if (questions.length === 0)
    throw new Error('Could not find any questions in that text.');
  return questions;
}
