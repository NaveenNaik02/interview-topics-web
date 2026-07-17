// Instruction presets are owned by ProgressContext (via user_settings in
// Supabase) alongside the rest of Settings — see setActiveInstructionPresetId
// / addInstructionPreset / updateInstructionPreset / deleteInstructionPreset
// there. This file only holds the shared type, the default content, and a
// localStorage mirror so getActiveInstructionText() can be read synchronously
// (needed to seed a fresh Add Question modal's instructions before the
// Supabase round-trip resolves). Per-question edits in that modal's
// Instructions dialog only change that question's local draft — they never
// write back here. The only way to change what NEW questions start with is
// to edit/select a preset from Settings.
export interface InstructionPreset {
  id: string
  name: string
  text: string
}

const PRESETS_KEY = 'prep-tracker:ai-instruction-presets'
const ACTIVE_PRESET_KEY = 'prep-tracker:ai-active-instruction-preset'

const DEFAULT_INSTRUCTIONS = [
  'Lead with a bold key term or topic name and a one-line definition in the same sentence, then expand with bullet points written as complete narrative sentences (not fragments). This is the default format.',
  "Keep it natural and concise, not padded — use only as many bullets as the topic genuinely needs. If the opening sentence alone fully answers it, that's enough.",
  'Bold key technical terms inline within the sentence as they come up — never as a static label like "**Caching:** ...".',
  'Use an em dash (—) within a bullet to add contrast or elaboration where it reads naturally.',
  'Switch to a Markdown table only when the content is inherently comparative (e.g. "X vs Y"). Use code blocks only when a code example is genuinely needed.',
].map(line => `- ${line}`).join('\n')

export const DEFAULT_PRESETS: InstructionPreset[] = [{ id: 'default', name: 'Default', text: DEFAULT_INSTRUCTIONS }]

export function presetUid(): string {
  return `preset_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function loadPresets(): InstructionPreset[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PRESETS_KEY) || 'null')
    if (Array.isArray(raw) && raw.length) return raw
  } catch {}
  return DEFAULT_PRESETS
}

export function savePresets(list: InstructionPreset[]) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)) } catch {}
}

export function loadActivePresetId(presets: InstructionPreset[]): string {
  let id: string | null = null
  try { id = localStorage.getItem(ACTIVE_PRESET_KEY) } catch {}
  if (id && presets.some(p => p.id === id)) return id
  return presets[0].id
}

export function saveActivePresetId(id: string) {
  try { localStorage.setItem(ACTIVE_PRESET_KEY, id) } catch {}
}

// Read-only helper used to seed a fresh question's instructions draft.
export function getActiveInstructionText(): string {
  const presets = loadPresets()
  const activeId = loadActivePresetId(presets)
  const active = presets.find(p => p.id === activeId)
  return active?.text || ''
}
