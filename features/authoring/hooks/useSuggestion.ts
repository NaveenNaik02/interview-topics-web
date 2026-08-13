import { useState } from 'react';
import {
  suggestPlacement,
  type PlacementSuggestion,
} from '@/lib/actions/suggestPlacement';
import type { TopicGroup } from '@/lib/topics';
import type { AqModelId } from '@/lib/aiModels';

interface Params {
  title: string;
  tags: string;
  model: AqModelId;
  groups: TopicGroup[];
}

// Asks Gemini where a question belongs. Produces a suggestion and nothing
// else — applying it is usePlacement's job, since that's what owns the
// selection the suggestion would change.
export const useSuggestion = ({ title, tags, model, groups }: Params) => {
  const [suggestion, setSuggestion] = useState<PlacementSuggestion | null>(
    null,
  );
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const suggest = async () => {
    setState('loading');
    setSuggestion(null);
    try {
      setSuggestion(
        await suggestPlacement({
          title,
          tags,
          groups: groups.map((g) => ({
            groupSlug: g.slug,
            groupName: g.groupName,
            sections: g.sections,
          })),
          model,
        }),
      );
      setState('idle');
    } catch {
      setState('error');
    }
  };

  return {
    suggestion,
    state,
    canSuggest: title.trim().length > 3 && state !== 'loading',
    suggest,
    dismiss: () => setSuggestion(null),
  };
};
