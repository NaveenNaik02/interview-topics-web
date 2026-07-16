'use client'

import { useState } from 'react'

// Settings owns the list of named presets and which one is "active" (the
// default new questions start from). Per-question edits in the Add Question
// modal's Instructions dialog only change that question's local draft — they
// never write back here. The only way to change what NEW questions start
// with is to edit/select a preset from Settings.
export interface InstructionPreset {
  id: string
  name: string
  text: string
}

const PRESETS_KEY = 'prep-tracker:ai-instruction-presets'
const ACTIVE_PRESET_KEY = 'prep-tracker:ai-active-instruction-preset'

function presetUid(): string {
  return `preset_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function loadPresets(): InstructionPreset[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PRESETS_KEY) || 'null')
    if (Array.isArray(raw) && raw.length) return raw
  } catch {}
  return [{ id: 'default', name: 'Default', text: '' }]
}

function savePresets(list: InstructionPreset[]) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)) } catch {}
}

export function loadActivePresetId(presets: InstructionPreset[]): string {
  let id: string | null = null
  try { id = localStorage.getItem(ACTIVE_PRESET_KEY) } catch {}
  if (id && presets.some(p => p.id === id)) return id
  return presets[0].id
}

function saveActivePresetId(id: string) {
  try { localStorage.setItem(ACTIVE_PRESET_KEY, id) } catch {}
}

// Read-only helper used to seed a fresh question's instructions draft.
export function getActiveInstructionText(): string {
  const presets = loadPresets()
  const activeId = loadActivePresetId(presets)
  const active = presets.find(p => p.id === activeId)
  return active?.text || ''
}

// Settings-facing hook: manage the list of presets and which is active.
export function useInstructionPresets() {
  const [presets, setPresets] = useState<InstructionPreset[]>(loadPresets)
  const [activeId, setActiveIdState] = useState<string>(() => loadActivePresetId(presets))

  const setActiveId = (id: string) => { setActiveIdState(id); saveActivePresetId(id) }

  const addPreset = ({ name, text }: { name: string; text: string }): InstructionPreset => {
    const record = { id: presetUid(), name: (name || 'Untitled').trim() || 'Untitled', text: (text || '').trim() }
    setPresets(prev => { const next = [...prev, record]; savePresets(next); return next })
    return record
  }

  const updatePreset = (id: string, { name, text }: { name: string; text: string }) => {
    setPresets(prev => {
      const next = prev.map(p => p.id === id ? { ...p, name: name.trim() || p.name, text: text.trim() } : p)
      savePresets(next)
      return next
    })
  }

  const deletePreset = (id: string) => {
    setPresets(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(p => p.id !== id)
      savePresets(next)
      if (activeId === id) setActiveId(next[0].id)
      return next
    })
  }

  return { presets, activeId, setActiveId, addPreset, updatePreset, deletePreset }
}
