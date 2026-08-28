'use client';

import { useState, useSyncExternalStore } from 'react';
import AqSelect from '@/components/AqSelect';
import {
  AQ_MODELS,
  AQ_MODEL_KEY,
  getSavedModel,
  type AqModelId,
} from '@/lib/aiModels';

// Nothing outside this component writes the key, so there's nothing to
// subscribe to — useSyncExternalStore is here for its server snapshot, which
// is what keeps SSR from rendering a different model than the client has.
const noSubscribe = () => () => {};
const serverModel = () => AQ_MODELS[0].id;

// Which model every AI action generates with. localStorage rather than
// user_settings: this tracks the rate limits the current browser has been
// hitting, so syncing it across devices would be the wrong behaviour.
export default function AiModelPicker() {
  const saved = useSyncExternalStore(noSubscribe, getSavedModel, serverModel);
  const [picked, setPicked] = useState<AqModelId | null>(null);
  const model = picked ?? saved;

  const pick = (id: string) => {
    setPicked(id as AqModelId);
    try {
      localStorage.setItem(AQ_MODEL_KEY, id);
    } catch {}
  };

  return (
    <AqSelect
      value={model}
      onChange={pick}
      options={AQ_MODELS.map((m) => ({
        value: m.id,
        label: m.label,
        sub: m.sub,
      }))}
    />
  );
}
