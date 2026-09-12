'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type PresetDraft = { id?: string; name: string; text: string };

const PresetEditorModal = ({
  initial,
  onClose,
  onSave,
}: {
  initial: PresetDraft;
  onClose: () => void;
  onSave: (name: string, text: string) => void;
}) => {
  const [name, setName] = useState(initial.name);
  const [text, setText] = useState(initial.text);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = name.trim().length > 0;

  return (
    <div className="aq-instr-scrim">
      <div
        className="aq-instr-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Instruction version"
      >
        <div className="aq-head">
          <h2>{initial.id ? 'Edit version' : 'New version'}</h2>
          <button
            className="aq-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
        <div className="aq-body">
          <div className="aq-field">
            <label htmlFor="preset-name">Name</label>
            <input
              id="preset-name"
              className="aq-input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Concise, Interview prep, Verbose"
            />
          </div>
          <div className="aq-field">
            <label>
              Formatting instructions{' '}
              <span className="aq-customize-sub">(optional)</span>
            </label>
            <div className="aq-md-wrap">
              <div className="aq-md-panes single show-editor">
                <div className="aq-md-editor-pane aq-instr-editor-pane">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      'e.g.\n- Keep answers to 3 short bullets max\n- Always include one runnable code example\n- Bold the key term being defined'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="aq-foot">
          <span className="aq-foot-left">
            This becomes the starting point for every new question until you
            switch or edit it again.
          </span>
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary btn-save"
              disabled={!canSave}
              onClick={() => onSave(name, text)}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresetEditorModal;
