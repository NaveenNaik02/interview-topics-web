'use client';

import { Sparkles } from 'lucide-react';
import AqSelect from '@/components/AqSelect';
import type { Placement } from '../hooks/usePlacement';

interface Props {
  // The form's usePlacement instance. Passed in rather than called here —
  // calling the hook again would create a second, unrelated copy of the
  // state, so this is the one thing that can't be read directly.
  placement: Placement;
}

// Topic/subtopic pickers plus the "Suggest placement" flow. The suggestion
// card previews where the AI wants the question to go — including topics or
// subtopics that don't exist yet — and only touches state when accepted.
export const PlacementPicker = ({ placement }: Props) => {
  const { groups, suggestion, suggestState } = placement;
  const groupName = (slug: string) =>
    groups.find((g) => g.slug === slug)?.groupName;

  return (
    <>
      <div className="aq-field">
        <div className="aq-label-row">
          <label>Placement</label>
          <button
            type="button"
            className={`aq-generate-btn ${suggestState === 'loading' ? 'loading' : ''}`}
            onClick={placement.suggest}
            disabled={!placement.canSuggest}
            title={
              placement.canSuggest
                ? 'Suggest where this question belongs, using the existing topics'
                : 'Write a question first'
            }
          >
            {suggestState === 'loading' ? (
              <>
                <span className="aq-gen-spinner" />
                Thinking…
              </>
            ) : (
              <>
                <Sparkles size={12.5} /> Suggest placement
              </>
            )}
          </button>
        </div>
        {suggestState === 'error' && (
          <div
            className="aq-gen-error"
            style={{ padding: '0 0 6px', background: 'none' }}
          >
            Couldn&apos;t get a suggestion — try again.
          </div>
        )}
      </div>

      <div className="aq-row">
        <div className="aq-field">
          <label htmlFor="aq-topic">Topic</label>
          <AqSelect
            id="aq-topic"
            value={placement.groupSlug}
            onChange={placement.setGroupSlug}
            options={placement.topicOptions}
          />
        </div>
        <div className="aq-field">
          <label htmlFor="aq-subtopic">Subtopic</label>
          <AqSelect
            id="aq-subtopic"
            value={placement.sectionK}
            onChange={placement.setSectionK}
            options={placement.sectionOptions}
          />
        </div>
      </div>

      {suggestion && (
        <div className="aq-suggest-card">
          <div className="aq-suggest-path">
            <Sparkles size={13} />
            <span>
              {suggestion.mode === 'existing' && (
                <>
                  <b>{groupName(suggestion.groupSlug)}</b>
                  {' → '}
                  <b>
                    {
                      groups
                        .find((g) => g.slug === suggestion.groupSlug)
                        ?.sections.find(
                          (s) =>
                            s.topic === suggestion.topic &&
                            s.file === suggestion.file,
                        )?.label
                    }
                  </b>
                </>
              )}
              {suggestion.mode === 'new-subtopic' && (
                <>
                  <b>{groupName(suggestion.groupSlug)}</b>
                  {' → '}
                  <b>{suggestion.label}</b>
                  <span className="aq-suggest-badge">new subtopic</span>
                </>
              )}
              {suggestion.mode === 'new-topic' && (
                <>
                  <b>{suggestion.topicName}</b>
                  <span className="aq-suggest-badge">new topic</span>
                  {' → '}
                  <b>{suggestion.label}</b>
                  <span className="aq-suggest-badge">new subtopic</span>
                </>
              )}
            </span>
          </div>
          {suggestion.reasoning && (
            <p className="aq-suggest-reason">{suggestion.reasoning}</p>
          )}
          <div className="aq-suggest-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={placement.dismissSuggestion}
            >
              Choose manually
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={placement.acceptSuggestion}
            >
              Use this placement
            </button>
          </div>
        </div>
      )}
    </>
  );
};
