import {
  type InstructionPreset,
  presetUid,
  savePresets,
  saveActivePresetId,
} from '@/lib/instructionPresets';
import type { SettingsSlice } from '@/lib/stores/types';
import type { UserSettings } from '../db/db';

type PresetActions = Pick<
  SettingsSlice,
  | 'setActiveInstructionPresetId'
  | 'addInstructionPreset'
  | 'updateInstructionPreset'
  | 'deleteInstructionPreset'
>;

export const createPresetActions = (
  set: (patch: Partial<SettingsSlice>) => void,
  get: () => SettingsSlice,
  updateRemote: (updates: Partial<UserSettings>) => void,
): PresetActions => {
  const commit = (next: InstructionPreset[]) => {
    set({ instructionPresets: next });
    savePresets(next);
    updateRemote({ instruction_presets: next });
  };

  return {
    setActiveInstructionPresetId: (id) => {
      set({ activeInstructionPresetId: id });
      saveActivePresetId(id);
      updateRemote({ active_instruction_preset_id: id });
    },

    addInstructionPreset: ({ name, text }) => {
      const record: InstructionPreset = {
        id: presetUid(),
        name: (name || 'Untitled').trim() || 'Untitled',
        text: (text || '').trim(),
      };
      commit([...get().instructionPresets, record]);
      return record;
    },

    updateInstructionPreset: (id, { name, text }) => {
      commit(
        get().instructionPresets.map((p) => {
          return p.id === id
            ? { ...p, name: name.trim() || p.name, text: text.trim() }
            : p;
        }),
      );
    },

    deleteInstructionPreset: (id) => {
      const { instructionPresets, activeInstructionPresetId } = get();
      const target = instructionPresets.find((p) => p.id === id);
      if (!target || target.protected || instructionPresets.length <= 1) {
        return;
      }
      const next = instructionPresets.filter((p) => p.id !== id);
      set({ instructionPresets: next });
      savePresets(next);
      // The active preset can't be one that no longer exists.
      const activeId =
        activeInstructionPresetId === id
          ? next[0].id
          : activeInstructionPresetId;
      if (activeId !== activeInstructionPresetId) {
        set({ activeInstructionPresetId: activeId });
        saveActivePresetId(activeId);
      }
      updateRemote({
        instruction_presets: next,
        active_instruction_preset_id: activeId,
      });
    },
  };
};
