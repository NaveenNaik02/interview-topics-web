'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { AQ_MODELS, type AqModelId, AQ_THINKING } from '@/lib/aiModels';

const DEFAULT_MODEL: AqModelId = AQ_MODELS[0].id;

export interface GenerateProblemInput {
  question: string;
  lang?: string;
  tags?: string;
  model?: string;
  instructions?: string;
}

export async function generateProblem(
  input: GenerateProblemInput,
): Promise<string> {
  await requireAuthor('Sign in to generate a problem statement');

  const apiKey = process.env.FREE_GEM_API_KEY;
  if (!apiKey) throw new Error('AI generation is not configured');

  const question = input.question.trim();
  if (question.length < 4) throw new Error('Question is too short');

  const model = AQ_MODELS.some((m) => m.id === input.model)
    ? (input.model as AqModelId)
    : DEFAULT_MODEL;

  const systemInstruction = [
    'You write a short, precise problem statement (1-3 sentences, plain prose, no preamble)',
    'describing what a developer must implement, for a coding-interview flashcard app.',
    'Name the function/signature if relevant. Respond with only the problem statement.',
    input.instructions?.trim() ? input.instructions.trim() : '',
  ]
    .filter(Boolean)
    .join(' ');

  const contextBits = [
    input.lang && input.lang !== 'none' ? `Language: ${input.lang}` : '',
    input.tags?.trim() ? `Tags: ${input.tags.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `${contextBits ? contextBits + '\n\n' : ''}Question: "${question}"`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
      body?.error?.message ||
        'Could not generate a problem statement — try again.',
    );
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text)
    throw new Error('Could not generate a problem statement — try again.');
  return text.trim();
}
