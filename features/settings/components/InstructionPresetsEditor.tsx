'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import PresetEditorModal, { type PresetDraft } from './PresetEditorModal';
import PresetRow from './PresetRow';

export default function InstructionPresetsEditor() {
  const presets = useAppStore((s) => s.instructionPresets);
  const addPreset = useAppStore((s) => s.addInstructionPreset);
  const updatePreset = useAppStore((s) => s.updateInstructionPreset);
  const deletePreset = useAppStore((s) => s.deleteInstructionPreset);
  const [editor, setEditor] = useState<PresetDraft | null>(null);

  return (
    <div className="instr-preset-list">
      {presets.map((p) => (
        <PresetRow
          key={p.id}
          preset={p}
          canDelete={!p.protected && presets.length > 1}
          onEdit={() => setEditor({ id: p.id, name: p.name, text: p.text })}
          onDelete={() => deletePreset(p.id)}
        />
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
