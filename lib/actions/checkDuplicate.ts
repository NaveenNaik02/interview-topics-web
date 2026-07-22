'use server'

import { createClient } from '@/lib/supabase/server'
import { supabasePublic } from '@/lib/supabase/public'
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels'

const DEFAULT_MODEL: AqModelId = AQ_MODELS[0].id

export interface CheckDuplicateInput {
  title: string
  topic: string
  file: string
  // Excludes this question's own row from the comparison set — otherwise
  // checking from the Edit modal always "finds" the question itself.
  excludeId?: string
  model?: string
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  match: string | null
  reasoning: string
}

// Validates the currently entered question against the other questions
// already in the selected topic/subtopic — the list to check against is
// resolved here, from whichever topic/subtopic is selected in the modal at
// the moment Check is clicked, not a fixed section.
export async function checkDuplicateQuestion(input: CheckDuplicateInput): Promise<DuplicateCheckResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.is_anonymous) throw new Error('Sign in to check for duplicates')

  const apiKey = process.env.FREE_GEM_API_KEY
  if (!apiKey) throw new Error('AI generation is not configured')

  const title = input.title.trim()
  if (title.length < 4) throw new Error('Write a question first')

  const { data: existing } = await supabasePublic
    .from('questions')
    .select('id, title')
    .eq('topic', input.topic)
    .eq('file', input.file)
    .order('number')

  const titles = (existing ?? [])
    .filter((r) => r.id !== input.excludeId)
    .map((r) => r.title)

  if (titles.length === 0) {
    return { isDuplicate: false, match: null, reasoning: 'This subtopic has no other questions yet.' }
  }

  const model = AQ_MODELS.some((m) => m.id === input.model) ? (input.model as AqModelId) : DEFAULT_MODEL

  const systemInstruction = [
    "You check whether a new flashcard question is a duplicate (or a very close near-duplicate) of any question already in a subtopic's list.",
    'Respond with ONLY minified JSON: {"isDuplicate":true|false,"matchIndex":<number or null>,"reasoning":"..."}.',
    'matchIndex is the 0-based index of the closest existing match when isDuplicate is true, else null.',
    'Keep reasoning under 16 words, no trailing period.',
  ].join(' ')

  const prompt = `Existing questions:\n${titles.map((t, i) => `${i}. ${t}`).join('\n')}\n\nNew question: "${title}"`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 }, responseMimeType: 'application/json' },
      }),
    }
  )

  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error?.message || 'Could not check for duplicates — try again.')
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Could not check for duplicates — try again.')

  let parsed: unknown
  try {
    parsed = JSON.parse(text.trim().replace(/^```(json)?\s*|```\s*$/g, ''))
  } catch {
    throw new Error('Could not read the duplicate check — try again.')
  }

  const p = parsed as Record<string, unknown>
  const isDuplicate = p.isDuplicate === true
  const reasoning = typeof p.reasoning === 'string' ? p.reasoning.trim() : ''
  const matchIndex = typeof p.matchIndex === 'number' ? p.matchIndex : null
  const match = isDuplicate && matchIndex != null ? titles[matchIndex] ?? null : null

  return { isDuplicate, match, reasoning }
}
