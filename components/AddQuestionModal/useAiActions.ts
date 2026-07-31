import { useState } from 'react'
import { generateAnswer } from '@/lib/actions/generateAnswer'
import { generateQuestion } from '@/lib/actions/generateQuestion'
import { generateProblem } from '@/lib/actions/generateProblem'
import { formatAnswer } from '@/lib/actions/formatAnswer'
import { suggestPlacement, type PlacementSuggestion } from '@/lib/actions/suggestPlacement'
import { checkDuplicateQuestion, type DuplicateCheckResult } from '@/lib/actions/checkDuplicate'
import type { TopicGroup, SectionMeta } from '@/lib/topics'
import type { AqModelId } from '@/lib/aiModels'
import { PENDING_GROUP_SLUG, PENDING_SECTION_KEY, type PendingPlacement } from './types'

const isRateLimited = (msg: string) => /rate|quota|limit|429|overloaded|exhausted|unavailable/i.test(msg)

interface Params {
  title: string
  markdown: string
  activeTopicName: string
  activeSectionLabel: string
  isImpl: boolean
  lang: string
  tags: string
  model: AqModelId
  instructions: string
  section?: SectionMeta
  isEdit: boolean
  editingId?: string
  groups: TopicGroup[]
  groupSlug: string
  sectionK: string
  typewrite: (text: string, onDone: () => void) => void
  typewriteQuestion: (text: string, onDone: () => void) => void
  typewriteProblem: (text: string, onDone: () => void) => void
  setTab: (tab: 'write' | 'preview') => void
  snapshotCurrentAnswer: () => void
  addAnswerVersion: (text: string) => void
  setGroupSlug: (slug: string) => void
  setSectionK: (key: string) => void
  setPendingPlacement: (p: PendingPlacement | null) => void
}

// All Gemini-backed authoring actions (question/problem/answer generation,
// formatting, placement suggestion, duplicate check) live here since they
// share the same request/loading/error shape and are pure business logic —
// the component only wires their returned state to buttons.
export function useAiActions(p: Params) {
  const [genState, setGenState] = useState<'idle' | 'loading' | 'done' | 'error' | 'limited'>('idle')
  const [genError, setGenError] = useState<string | null>(null)
  const [questionGen, setQuestionGen] = useState<'idle' | 'loading' | 'error'>('idle')
  const [problemGen, setProblemGen] = useState<'idle' | 'loading' | 'error'>('idle')
  const [dupState, setDupState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null)
  const [placeState, setPlaceState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [placement, setPlacement] = useState<PlacementSuggestion | null>(null)

  const handleGenerateQuestion = async () => {
    setQuestionGen('loading')
    try {
      const text = await generateQuestion({
        topicName: p.activeTopicName,
        subName: p.activeSectionLabel,
        seed: p.title,
        isImpl: p.isImpl,
        lang: p.lang,
        tags: p.tags,
        model: p.model,
        instructions: p.instructions,
      })
      p.typewriteQuestion(text, () => setQuestionGen('idle'))
    } catch (err) {
      setQuestionGen('error')
      setGenError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleGenerateProblem = async () => {
    setProblemGen('loading')
    try {
      const text = await generateProblem({ question: p.title, lang: p.lang, tags: p.tags, model: p.model, instructions: p.instructions })
      p.typewriteProblem(text, () => setProblemGen('idle'))
    } catch {
      setProblemGen('error')
    }
  }

  const handleGenerate = async () => {
    p.snapshotCurrentAnswer()
    setGenState('loading')
    setGenError(null)
    p.setTab('write')
    try {
      const text = await generateAnswer({
        question: p.title,
        topicName: p.activeTopicName,
        subName: p.activeSectionLabel,
        instructions: p.instructions,
        model: p.model,
      })
      p.typewrite(text, () => { setGenState('done'); p.addAnswerVersion(text) })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setGenState(isRateLimited(msg) ? 'limited' : 'error')
      setGenError(msg)
    }
  }

  const handleFormat = async () => {
    p.snapshotCurrentAnswer()
    setGenState('loading')
    setGenError(null)
    p.setTab('write')
    try {
      const text = await formatAnswer({ text: p.markdown, question: p.title, instructions: p.instructions, isImpl: p.isImpl, lang: p.lang, model: p.model })
      p.typewrite(text, () => { setGenState('done'); p.addAnswerVersion(text) })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setGenState(isRateLimited(msg) ? 'limited' : 'error')
      setGenError(msg)
    }
  }

  const handleSuggestPlacement = async () => {
    setPlaceState('loading')
    setPlacement(null)
    try {
      const result = await suggestPlacement({
        title: p.title,
        tags: p.tags,
        groups: p.groups.map(g => ({
          groupSlug: g.slug,
          groupName: g.groupName,
          sections: g.sections.map(s => ({ topic: s.topic, file: s.file, label: s.label })),
        })),
        model: p.model,
      })
      setPlacement(result)
      setPlaceState('idle')
    } catch {
      setPlaceState('error')
    }
  }

  const handleCheckDuplicate = async () => {
    if (!p.section) return
    setDupState('loading')
    setDupResult(null)
    try {
      const result = await checkDuplicateQuestion({
        title: p.title,
        topic: p.section.topic,
        file: p.section.file,
        excludeId: p.isEdit ? p.editingId : undefined,
        model: p.model,
      })
      setDupResult(result)
      setDupState('done')
    } catch {
      setDupState('error')
    }
  }

  const handleApplyPlacement = () => {
    if (!placement) return
    if (placement.mode === 'existing') {
      p.setPendingPlacement(null)
      p.setGroupSlug(placement.groupSlug)
      p.setSectionK(`${placement.topic}/${placement.file}`)
    } else if (placement.mode === 'new-subtopic') {
      p.setPendingPlacement({ kind: 'new-subtopic', groupSlug: placement.groupSlug, label: placement.label })
      p.setGroupSlug(placement.groupSlug)
      p.setSectionK(PENDING_SECTION_KEY)
    } else {
      p.setPendingPlacement({ kind: 'new-topic', topicName: placement.topicName, blurb: placement.blurb, label: placement.label })
      p.setGroupSlug(PENDING_GROUP_SLUG)
      p.setSectionK(PENDING_SECTION_KEY)
    }
    setPlacement(null)
  }

  return {
    genState, genError, questionGen, problemGen, dupState, dupResult, placeState, placement,
    setDupState, setDupResult,
    handleGenerateQuestion, handleGenerateProblem, handleGenerate, handleFormat,
    handleSuggestPlacement, handleCheckDuplicate, handleApplyPlacement,
    clearPlacement: () => setPlacement(null),
  }
}
