'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { AQ_MODELS, type AqModelId, AQ_THINKING } from '@/lib/aiModels';

const DEFAULT_MODEL: AqModelId = AQ_MODELS[0].id;

export interface CodeGenerationInput {
  code: string;
  lang?: string;
  // Only used by the explanation prompt — knowing the expected output keeps
  // it from having to derive one, and from contradicting the saved value.
  output?: string;
  model?: string;
  // The explanation's formatting instructions — the 'code-explanation'
  // instruction preset, editable per-question and in Settings. Ignored by
  // generateCodeOutput: raw output has no formatting to steer.
  instructions?: string;
}

const OUTPUT_SYSTEM =
  'You are a code interpreter. Given a code snippet, determine exactly what it prints/returns/outputs when run. ' +
  'Respond with ONLY the raw output — no explanation, no preamble, no markdown code fences, no backticks. ' +
  'If it would throw an error, respond with the exact error message. If it produces no output, respond with "(no output)".';

// The formatting half of this prompt lives in the 'code-explanation'
// instruction preset (lib/instructionPresets.ts) so it stays editable; what's
// fixed here is the task itself and the no-preamble rule.
const EXPLAIN_SYSTEM =
  "You write a short explanation, in Markdown, of why a code snippet produces its output — for a developer flashcard app's code-output question. " +
  'Respond ONLY with the explanation — no preamble, no closing remarks.';

async function generate(
  input: CodeGenerationInput,
  baseSystem: string,
  contextBits: string[],
  failure: string,
  useInstructions = false,
): Promise<string> {
  await requireAuthor('Sign in to use AI generation');

  const apiKey = process.env.FREE_GEM_API_KEY;
  if (!apiKey) throw new Error('AI generation is not configured');

  const code = input.code.trim();
  if (code.length < 4) throw new Error('Code snippet is too short');

  const model = AQ_MODELS.some((m) => m.id === input.model)
    ? (input.model as AqModelId)
    : DEFAULT_MODEL;

  const systemInstruction = [
    baseSystem,
    useInstructions ? input.instructions?.trim() : '',
  ]
    .filter(Boolean)
    .join(' ');

  const prompt = `${contextBits.filter(Boolean).join('\n')}\n\nCode:\n${code}`;

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
  if (!res.ok) throw new Error(body?.error?.message || failure);

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(failure);
  return text.trim();
}

const langLine = (lang?: string) => {
  return lang && lang !== 'none' ? `Language: ${lang}` : '';
};

export async function generateCodeOutput(
  input: CodeGenerationInput,
): Promise<string> {
  return generate(
    input,
    OUTPUT_SYSTEM,
    [langLine(input.lang)],
    'Could not work out the output — try again.',
  );
}

export async function generateCodeExplanation(
  input: CodeGenerationInput,
): Promise<string> {
  return generate(
    input,
    EXPLAIN_SYSTEM,
    [
      langLine(input.lang),
      input.output?.trim()
        ? `Output: ${input.output.trim()}`
        : 'Output: (not specified — determine it yourself as part of the explanation)',
    ],
    'Could not generate an explanation — try again.',
    true,
  );
}
