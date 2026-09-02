import {
  AQ_MODELS,
  type AqModelId,
  DEFAULT_MODEL,
  AQ_THINKING,
} from './models';

interface GeminiCall {
  system: string;
  prompt: string;
  model?: string;
  // Shown when the request fails or comes back empty.
  failure: string;
}

async function call(o: GeminiCall, json: boolean): Promise<string> {
  // Free-tier key from a project with no billing account attached — keep
  // separate from GEMINI_API_KEY (Prep Tracker, now on paid Tier 1).
  const apiKey = process.env.FREE_GEM_API_KEY;
  if (!apiKey) throw new Error('AI generation is not configured');

  const model = AQ_MODELS.some((m) => m.id === o.model)
    ? (o.model as AqModelId)
    : DEFAULT_MODEL;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: o.system }] },
        contents: [{ role: 'user', parts: [{ text: o.prompt }] }],
        generationConfig: {
          // These prompts don't need reasoning — skip Gemini 3's default
          // thinking pass, which otherwise burns ~10x the tokens of the answer.
          thinkingConfig: AQ_THINKING,
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
  );

  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || o.failure);

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(o.failure);
  return text.trim();
}

export function gemini(o: GeminiCall): Promise<string> {
  return call(o, false);
}

// Callers validate the shape themselves — the model can return well-formed
// JSON that still describes something that doesn't exist.
export async function geminiJson(
  o: GeminiCall & { parseFailure: string },
): Promise<unknown> {
  const text = await call(o, true);
  try {
    // responseMimeType usually prevents fences, but not reliably.
    return JSON.parse(text.replace(/^```(json)?\s*|```\s*$/g, ''));
  } catch {
    throw new Error(o.parseFailure);
  }
}
