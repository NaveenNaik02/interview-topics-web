import { describe, it, expect } from 'vitest'
import { migratePresets, DEFAULT_PRESETS, type InstructionPreset } from './instructionPresets'

describe('migratePresets', () => {
  it('backfills every protected preset for a pre-migration single-preset list', () => {
    const legacy: InstructionPreset[] = [{ id: 'default', name: 'Default', text: 'Old instructions' }]
    const result = migratePresets(legacy)

    expect(result).toHaveLength(DEFAULT_PRESETS.length + 1)
    expect(result.find(p => p.id === 'default')).toBeDefined()
    for (const kind of DEFAULT_PRESETS.map(p => p.kind)) {
      expect(result.find(p => p.kind === kind)).toBeDefined()
    }
  })

  it('only appends the missing kind when the rest already exist', () => {
    const withoutProblem = DEFAULT_PRESETS.filter(p => p.kind !== 'problem')
    const result = migratePresets(withoutProblem)

    expect(result).toHaveLength(DEFAULT_PRESETS.length)
    expect(result.find(p => p.kind === 'problem')?.text).toBe(
      DEFAULT_PRESETS.find(p => p.kind === 'problem')?.text
    )
  })

  it('is a no-op on an already-migrated list', () => {
    const result = migratePresets(DEFAULT_PRESETS)
    expect(result).toHaveLength(DEFAULT_PRESETS.length)
    expect(result.map(p => p.id)).toEqual(DEFAULT_PRESETS.map(p => p.id))
  })

  it('backfills blank text on every non-text default if ever saved empty', () => {
    // 'text' is excluded on purpose — migratePresets has never restored it,
    // since a deliberately blank answer-format instruction is a valid choice.
    const blanked = DEFAULT_PRESETS.filter(p => p.kind && p.kind !== 'text')
    const result = migratePresets(
      DEFAULT_PRESETS.map(p => (blanked.includes(p) ? { ...p, text: '' } : p))
    )

    for (const p of blanked) {
      expect(result.find(x => x.kind === p.kind)?.text).toBe(p.text)
    }
  })
})
