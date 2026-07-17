'use server'

import { createClient } from '@/lib/supabase/server'
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels'

const DEFAULT_MODEL: AqModelId = AQ_MODELS[0].id

export interface GenerateAnswerInput {
  question: string
  topicName?: string
  subName?: string
  instructions?: string
  model?: string
}

export async function generateAnswer(input: GenerateAnswerInput): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.is_anonymous) throw new Error('Sign in to generate answers')

  // Free-tier key from a project with no billing account attached — keep
  // separate from GEMINI_API_KEY (Prep Tracker, now on paid Tier 1).
  const apiKey = process.env.FREE_GEM_API_KEY
  if (!apiKey) throw new Error('AI generation is not configured')

  const question = input.question.trim()
  if (question.length < 4) throw new Error('Question is too short')

  const model = AQ_MODELS.some(m => m.id === input.model) ? (input.model as AqModelId) : DEFAULT_MODEL

  // Style/depth guidance lives in the client's editable "Instructions" field
  // (defaults to content/answer-draft.md's convention, but the user sees and
  // can change it there) — this only holds the non-negotiable technical
  // constraints tied to how the app renders the result.
  const systemInstruction = [
    'You write study answers for a developer flashcard app.',
    'Respond only in Markdown.',
    'Do NOT start with a Markdown heading (#, ##, ###) — the question itself is already the heading; the answer body starts directly with prose.',
    'No preamble, no closing remarks, no "In summary" — start directly with the answer and end when the explanation is complete.',
    input.instructions?.trim()
      ? `Follow these formatting and style instructions from the author: ${input.instructions.trim()}`
      : '',
  ].filter(Boolean).join(' ')

  const contextBits = input.topicName && input.subName ? `Topic: ${input.topicName} → ${input.subName}` : ''
  const prompt = `${contextBits ? contextBits + '\n\n' : ''}Write the answer to this flashcard question:\n\n"${question}"`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        // Flashcard answers don't need reasoning — skip Gemini 3's default
        // thinking pass, which otherwise burns ~10x the tokens of the answer.
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  )

  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error?.message || 'Could not generate an answer — try again.')
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Could not generate an answer — try again.')
  return text.trim()
}
