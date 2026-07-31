'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels'
import { loadPresets } from '@/lib/instructionPresets'
import AqSelect from '../AqSelect'
import MarkdownField from './MarkdownField'

interface Props {
  value: string
  model: AqModelId
  isImpl: boolean
  onClose: () => void
  onSave: (v: string, m: AqModelId) => void
}

export default function InstructionsModal({ value, model, isImpl, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(value)
  const [draftModel, setDraftModel] = useState<AqModelId>(model)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const presets = useMemo(() => loadPresets(), [])
  const [presetPick, setPresetPick] = useState(() => presets.find(p => p.kind === (isImpl ? 'code' : 'text'))?.id ?? presets[0]?.id ?? '')

  const handleLoadPreset = (id: string) => {
    setPresetPick(id)
    if (!id) return
    const p = presets.find(x => x.id === id)
    if (p) setDraft(p.text)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="aq-instr-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="aq-instr-modal" role="dialog" aria-modal="true" aria-label="Instructions">
        <div className="aq-head">
          <h2>Instructions</h2>
          <button className="aq-close" onClick={onClose} aria-label="Close" title="Close"><X size={15} /></button>
        </div>
        <div className="aq-body">
          <div className="aq-field">
            <label>AI model</label>
            <AqSelect
              value={draftModel}
              onChange={(v) => setDraftModel(v as AqModelId)}
              options={AQ_MODELS.map(m => ({ value: m.id, label: m.label, sub: m.sub }))}
            />
            <p className="aq-model-hint">If a model is rate-limited, switch here and regenerate.</p>
          </div>
          {presets.length > 1 && (
            <div className="aq-field">
              <label>Start from a saved version <span className="aq-customize-sub">(loads into this question only — your default in Settings won&apos;t change)</span></label>
              <AqSelect
                value={presetPick}
                onChange={handleLoadPreset}
                options={presets.map(p => ({ value: p.id, label: p.name, sub: p.text.trim() ? undefined : 'Blank' }))}
              />
            </div>
          )}
          <div className="aq-field">
            <label>How should the AI format generated answers? <span className="aq-customize-sub">(this question only)</span></label>
            <MarkdownField
              tab={tab}
              onTabChange={setTab}
              value={draft}
              onChange={setDraft}
              autoFocus
              editorPaneClassName="aq-instr-editor-pane"
              placeholder={'e.g.\n- Keep answers to 3 short bullets max\n- Always include one runnable code example\n- Bold the key term being defined'}
              emptyPreviewText="Preview appears here as you type…"
            />
          </div>
        </div>
        <div className="aq-foot">
          <span className="aq-foot-left">Applies to this question only — manage your default in Settings.</span>
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-primary btn-save" onClick={() => onSave(draft, draftModel)}>Use for this question</button>
          </div>
        </div>
      </div>
    </div>
  )
}
