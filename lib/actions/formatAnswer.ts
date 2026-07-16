'use server'

import { createClient } from '@/lib/supabase/server'
import { isLocalSupabase } from '@/lib/utils'
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels'

const DEFAULT_MODEL: AqModelId = AQ_MODELS[0].id

export interface FormatAnswerInput {
  text: string
  question?: string
  instructions?: string
  isImpl?: boolean
  lang?: string
  model?: string
}

// Reformats rough/pasted text into the app's answer style, without adding or
// removing substance — unlike generateAnswer, this never invents content.
export async function formatAnswer(input: FormatAnswerInput): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.is_anonymous && !isLocalSupabase()) throw new Error('Sign in to format answers')

  const apiKey = process.env.FREE_GEM_API_KEY
  if (!apiKey) throw new Error('AI generation is not configured')

  const text = input.text.trim()
  if (text.length < 4) throw new Error('Nothing to format yet')

  const model = AQ_MODELS.some(m => m.id === input.model) ? (input.model as AqModelId) : DEFAULT_MODEL

  const systemInstruction = input.isImpl
    ? [
      "You reformat rough code/notes into a clean solution for a developer flashcard app's IMPLEMENTATION question.",
      'Respond with ONLY a fenced code block (with a language tag) — no prose, no explanation, no headings.',
      "Keep the author's logic and approach intact; only clean up formatting/syntax.",
      input.instructions?.trim() ? `Additionally, follow these formatting preferences from the author: ${input.instructions.trim()}` : '',
    ].filter(Boolean).join(' ')
    : [
      'You reformat rough notes into a clean Markdown study answer for a developer flashcard app.',
      'Keep every fact, step, and piece of content the author wrote — do not add new information, do not remove',
      'substance, and do not soften or expand the meaning. Only apply structure: bold key terms inline,',
      'short paragraphs or lists where that helps scanning, and fenced code blocks (with a language tag) for any code.',
      'Do NOT start with a Markdown heading — the question itself is already the heading.',
      'Respond ONLY with the reformatted Markdown — no preamble, no closing remarks.',
      input.instructions?.trim() ? `Additionally, follow these formatting preferences from the author: ${input.instructions.trim()}` : '',
    ].filter(Boolean).join(' ')

  const contextBits = [
    input.question?.trim() ? `Question: ${input.question.trim()}` : '',
    input.lang && input.lang !== 'none' ? `Primary language: ${input.lang}` : '',
  ].filter(Boolean).join('\n')

  const prompt = `${contextBits ? contextBits + '\n\n' : ''}Reformat this into the answer's Markdown style:\n\n${text}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  )

  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error?.message || 'Could not format this answer — try again.')
  }

  const out = body?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!out) throw new Error('Could not format this answer — try again.')
  return out.trim()
}
