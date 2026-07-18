import { describe, it, expect } from 'vitest'
import { migratePresets, DEFAULT_PRESETS, type InstructionPreset } from './instructionPresets'

describe('migratePresets', () => {
  it('backfills all four protected presets for a pre-migration single-preset list', () => {
    const legacy: InstructionPreset[] = [{ id: 'default', name: 'Default', text: 'Old instructions' }]
    const result = migratePresets(legacy)

    expect(result).toHaveLength(5)
    expect(result.find(p => p.id === 'default')).toBeDefined()
    expect(result.find(p => p.kind === 'text')).toBeDefined()
    expect(result.find(p => p.kind === 'code')).toBeDefined()
    expect(result.find(p => p.kind === 'suggestion')).toBeDefined()
    expect(result.find(p => p.kind === 'problem')).toBeDefined()
  })

  it('only appends the missing kind when three of the four already exist', () => {
    const withoutProblem = DEFAULT_PRESETS.filter(p => p.kind !== 'problem')
    const result = migratePresets(withoutProblem)

    expect(result).toHaveLength(4)
    expect(result.find(p => p.kind === 'problem')?.text).toBe(
      DEFAULT_PRESETS.find(p => p.kind === 'problem')?.text
    )
  })

  it('is a no-op on an already-migrated list', () => {
    const result = migratePresets(DEFAULT_PRESETS)
    expect(result).toHaveLength(DEFAULT_PRESETS.length)
    expect(result.map(p => p.id)).toEqual(DEFAULT_PRESETS.map(p => p.id))
  })

  it('backfills blank text on the code/suggestion/problem defaults if ever saved empty', () => {
    const withBlanks = DEFAULT_PRESETS.map(p =>
      p.kind === 'code' || p.kind === 'suggestion' || p.kind === 'problem' ? { ...p, text: '' } : p
    )
    const result = migratePresets(withBlanks)

    expect(result.find(p => p.kind === 'code')?.text).toBe(DEFAULT_PRESETS.find(p => p.kind === 'code')?.text)
    expect(result.find(p => p.kind === 'suggestion')?.text).toBe(DEFAULT_PRESETS.find(p => p.kind === 'suggestion')?.text)
    expect(result.find(p => p.kind === 'problem')?.text).toBe(DEFAULT_PRESETS.find(p => p.kind === 'problem')?.text)
  })
})
