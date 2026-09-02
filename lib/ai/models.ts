// All verified callable against the free-tier Gemini key (no billing account
// attached) via v1beta generateContent. Shared between the client (model
// picker) and the server action (validates the requested id against this
// exact list) — a 'use server' file can only export async functions, so this
// can't live in generateAnswer.ts. Labels carry the version because two of
// these are Flash Lite; [0] is the fallback when nothing is saved.
export const AQ_MODELS = [
  { id: 'gemini-3.1-flash-lite', label: 'Flash Lite 3.1', sub: 'Fast' },
  { id: 'gemini-3.5-flash-lite', label: 'Flash Lite 3.5', sub: 'Fast, newer' },
  { id: 'gemini-3-flash-preview', label: 'Flash 3', sub: 'Higher quality' },
] as const;

export type AqModelId = (typeof AQ_MODELS)[number]['id'];

// Fallback whenever a caller passes no model, or one not in AQ_MODELS.
export const DEFAULT_MODEL: AqModelId = AQ_MODELS[0].id;

// Minimal thinking, phrased the way every model in AQ_MODELS accepts.
// `thinkingBudget: 0` is the older field and gemini-3.5+ rejects it outright
// with a 400 INVALID_ARGUMENT, so all generation actions share this instead.
export const AQ_THINKING = { thinkingLevel: 'low' } as const;

// Chosen in Settings, read wherever a question or answer is generated.
// Device-local on purpose: which model is usable right now is about the
// rate limits this browser has been hitting, not a cross-device preference.
export const AQ_MODEL_KEY = 'prep-tracker:ai-model';

// Never call this during render on the server — it reads localStorage, so a
// component must take it in an effect or the SSR markup won't match.
export const getSavedModel = (): AqModelId => {
  try {
    const saved = localStorage.getItem(AQ_MODEL_KEY);
    return AQ_MODELS.some((m) => m.id === saved)
      ? (saved as AqModelId)
      : AQ_MODELS[0].id;
  } catch {
    return AQ_MODELS[0].id;
  }
};

// Auto-run pins itself here regardless of the picker: one run is 3-4 calls
// fired back to back, which is most of Flash's 5 requests/minute free-tier
// budget, so running it on Flash rate-limits itself. Flash Lite has 15.
export const AUTO_RUN_MODEL: AqModelId = 'gemini-3.1-flash-lite';
