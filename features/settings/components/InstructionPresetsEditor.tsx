'use client';

import { useState } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import { useProgress } from '@/lib/context/ProgressContext';
import PresetEditorModal, { type PresetDraft } from './PresetEditorModal';

export default function InstructionPresetsEditor() {
  const {
    instructionPresets: presets,
    addInstructionPreset: addPreset,
    updateInstructionPreset: updatePreset,
    deleteInstructionPreset: deletePreset,
  } = useProgress();
  const [editor, setEditor] = useState<PresetDraft | null>(null);

  return (
    <div className="instr-preset-list">
      {presets.map((p) => (
        <div key={p.id} className="instr-preset-row">
          <div className="instr-preset-text">
            <div className="instr-preset-name">
              {p.protected && <Lock size={12} aria-label="Can't be deleted" />}
              <span className="instr-preset-name-text">{p.name}</span>
              {p.kind === 'text' && (
                <span className="instr-preset-tag" title="Explanation default">
                  Explanation default
                </span>
              )}
              {p.kind === 'code' && (
                <span className="instr-preset-tag" title="Code default">
                  Code default
                </span>
              )}
              {p.kind === 'suggestion' && (
                <span className="instr-preset-tag" title="Suggestion default">
                  Suggestion default
                </span>
              )}
              {p.kind === 'problem' && (
                <span className="instr-preset-tag" title="Problem default">
                  Problem default
                </span>
              )}
            </div>
            <div className="instr-preset-preview">
              {p.text.trim()
                ? p.text.trim()
                : 'No formatting preferences — uses the base prompt only.'}
            </div>
          </div>
          <div className="instr-preset-actions">
            <button
              type="button"
              className="instr-preset-btn"
              title="Edit"
              aria-label={`Edit ${p.name}`}
              onClick={() =>
                setEditor({ id: p.id, name: p.name, text: p.text })
              }
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              className="instr-preset-btn danger"
              title={p.protected ? "This default can't be deleted" : 'Delete'}
              aria-label={`Delete ${p.name}`}
              disabled={p.protected || presets.length <= 1}
              onClick={() => deletePreset(p.id)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="instr-preset-add"
        onClick={() => setEditor({ name: '', text: '' })}
      >
        <span className="instr-plus">+</span> New version
      </button>

      {editor && (
        <PresetEditorModal
          initial={editor}
          onClose={() => setEditor(null)}
          onSave={(name, text) => {
            if (editor.id) updatePreset(editor.id, { name, text });
            else addPreset({ name, text });
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}
