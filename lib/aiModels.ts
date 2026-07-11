// Both verified against the free-tier Gemini key (no billing account
// attached). Shared between the client (model picker) and the server action
// (validates the requested id against this exact list) — a 'use server' file
// can only export async functions, so this can't live in generateAnswer.ts.
export const AQ_MODELS = [
  { id: 'gemini-3.1-flash-lite', label: 'Flash Lite', sub: 'Fast' },
  { id: 'gemini-3-flash-preview', label: 'Flash', sub: 'Higher quality' },
] as const

export type AqModelId = typeof AQ_MODELS[number]['id']
