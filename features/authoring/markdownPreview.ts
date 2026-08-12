import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { MAX_ANSWER_DRAFTS, type AnswerVersion } from './types'

export function renderPreviewHtml(markdown: string): string {
  if (!markdown.trim()) return ''
  const raw = marked.parse(markdown, { breaks: true }) as string
  const remapped = raw.replace(/<h[1-6]([^>]*)>/gi, '<h4$1>').replace(/<\/h[1-6]>/gi, '</h4>')
  return DOMPurify.sanitize(remapped)
}

export function capAnswerVersions(list: AnswerVersion[]): AnswerVersion[] {
  const original = list.find(v => v.id === 'original')
  const drafts = list.filter(v => v.id !== 'original').slice(-MAX_ANSWER_DRAFTS)
  return original ? [original, ...drafts] : drafts
}
