'use server'

import { createClient } from '@/lib/supabase/server'
import { isLocalSupabase } from '@/lib/utils'
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels'

const DEFAULT_MODEL: AqModelId = AQ_MODELS[0].id

export interface GenerateQuestionInput {
  topicName: string
  subName?: string
  seed?: string
  isImpl?: boolean
  lang?: string
  tags?: string
  model?: string
}

export async function generateQuestion(input: GenerateQuestionInput): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.is_anonymous && !isLocalSupabase()) throw new Error('Sign in to generate questions')

  const apiKey = process.env.FREE_GEM_API_KEY
  if (!apiKey) throw new Error('AI generation is not configured')

  const model = AQ_MODELS.some(m => m.id === input.model) ? (input.model as AqModelId) : DEFAULT_MODEL

  const systemInstruction = [
    'You write a single realistic technical interview/study question for a developer flashcard app.',
    input.isImpl
      ? 'It must describe a concrete coding task to implement (e.g. "Implement a function that …").'
      : 'It should be answerable in a focused written explanation.',
    'Respond with ONLY the question itself — one sentence, no quotes, no preamble, no numbering.',
  ].join(' ')

  const contextBits = [
    input.subName ? `Topic: ${input.topicName} → ${input.subName}` : `Topic: ${input.topicName}`,
    input.lang && input.lang !== 'none' ? `Language: ${input.lang}` : '',
    input.tags?.trim() ? `Tags: ${input.tags.trim()}` : '',
  ].filter(Boolean).join('\n')

  const seed = input.seed?.trim() ? `\n\nRefine or riff on this rough idea rather than ignoring it: "${input.seed.trim()}"` : ''
  const prompt = `${contextBits}${seed}`

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
    throw new Error(body?.error?.message || 'Could not generate a question — try again.')
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Could not generate a question — try again.')
  return text.trim().replace(/^["']|["']$/g, '')
}
