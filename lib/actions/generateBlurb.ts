'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { AQ_MODELS, AQ_THINKING } from '@/lib/aiModels';

const DEFAULT_MODEL = AQ_MODELS[0].id;

// Small sibling of generateAnswer.ts for the Add Topic modal's "Generate"
// blurb button — same Gemini call shape, no model picker (this text is
// short enough that model choice isn't worth a UI control here).
export async function generateTopicBlurb(topicName: string): Promise<string> {
  await requireAuthor('Sign in to generate a blurb');

  const apiKey = process.env.FREE_GEM_API_KEY;
  if (!apiKey) throw new Error('AI generation is not configured');

  const name = topicName.trim();
  if (name.length < 2) throw new Error('Topic name is too short');

  const systemInstruction =
    'You write a single short blurb (max ~12 words, one sentence fragment, no trailing period) ' +
    'for a topic card in a developer interview-prep app. No preamble — respond with only the blurb text.';
  const prompt = `Topic: "${name}"`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { thinkingConfig: AQ_THINKING },
      }),
    },
  );

  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      body?.error?.message || 'Could not generate a blurb — try again.',
    );
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Could not generate a blurb — try again.');
  return text.trim().replace(/^"|"$/g, '');
}
