import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { addTopicGroup, addSection } from '@/lib/actions/topics';
import { findGroupForSection, type SectionMeta } from '@/lib/topics';
import type { AqModelId } from '@/lib/aiModels';
import { buildPlacementOptions, sectionKey } from '../utils/placementOptions';
import { useSuggestion } from './useSuggestion';
import {
  PENDING_GROUP_SLUG,
  PENDING_SECTION_KEY,
  type PendingPlacement,
} from '../types';

interface Params {
  initialSection?: SectionMeta;
  // The question being placed — what the AI suggests a placement from.
  title: string;
  tags: string;
  model: AqModelId;
}

// Where the question gets filed. Holds the selected topic/subtopic, plus any
// topic/subtopic staged by an accepted AI suggestion — staged ones exist only
// in memory until resolveTargetSection creates them at save time.
export const usePlacement = ({
  initialSection,
  title,
  tags,
  model,
}: Params) => {
  // A freshly-added topic with no subtopics yet has nowhere to attach a
  // question — exclude it from the picker until it has at least one section.
  const groups = useAppStore((s) => s.groups).filter(
    (g) => g.sections.length > 0,
  );

  const initialGroup = initialSection
    ? findGroupForSection(groups, initialSection)
    : null;
  const [groupSlug, setGroupSlug] = useState(
    initialGroup?.slug ?? groups[0].slug,
  );
  // Lazy initializer: evaluated once at mount, when groupSlug can't yet be
  // the pending-topic sentinel — so the group is whatever seeded it above.
  const [sectionK, setSectionK] = useState(() =>
    sectionKey(initialSection ?? (initialGroup ?? groups[0]).sections[0]),
  );
  const [pending, setPending] = useState<PendingPlacement | null>(null);

  const { group, topicOptions, sectionOptions } = buildPlacementOptions(
    groups,
    groupSlug,
    pending,
  );
  const section =
    group?.sections.find((s) => sectionKey(s) === sectionK) ??
    group?.sections[0];

  // The options already map a selected value to its display name, for staged
  // placements as much as real ones.
  const labelOf = (options: { value: string; label: string }[], v: string) =>
    options.find((o) => o.value === v)?.label ?? '';

  // Switching topics leaves sectionK pointing at the old topic's subtopic.
  useEffect(() => {
    if (sectionOptions.some((o) => o.value === sectionK)) return;
    if (sectionOptions[0]) setSectionK(sectionOptions[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSlug]);

  const ai = useSuggestion({ title, tags, model, groups });

  // Accepting always clears the suggestion — the card's job is done once the
  // pickers reflect it.
  const acceptSuggestion = () => {
    const s = ai.suggestion;
    if (!s) return;
    ai.dismiss();
    if (s.mode === 'existing') {
      setPending(null);
      setGroupSlug(s.groupSlug);
      setSectionK(`${s.topic}/${s.file}`);
      return;
    }
    setPending(s);
    setGroupSlug(s.mode === 'new-topic' ? PENDING_GROUP_SLUG : s.groupSlug);
    setSectionK(PENDING_SECTION_KEY);
  };

  // A staged topic/subtopic is created here and nowhere else — right before
  // the question that needs it — so cancelling the modal earlier never leaves
  // an empty topic/subtopic behind.
  const resolveTargetSection = async (): Promise<SectionMeta> => {
    if (groupSlug === PENDING_GROUP_SLUG && pending?.mode === 'new-topic') {
      const group = await addTopicGroup({
        groupName: pending.topicName,
        blurb: pending.blurb,
      });
      return (await addSection({ groupSlug: group.slug, label: pending.label }))
        .section;
    }
    if (sectionK === PENDING_SECTION_KEY && pending?.mode === 'new-subtopic') {
      return (
        await addSection({
          groupSlug: pending.groupSlug,
          label: pending.label,
        })
      ).section;
    }
    return section!;
  };

  return {
    groups,
    groupSlug,
    setGroupSlug,
    sectionK,
    setSectionK,
    section,
    topicOptions,
    sectionOptions,
    activeTopicName: labelOf(topicOptions, groupSlug),
    activeSectionLabel: labelOf(sectionOptions, sectionK),
    // Nothing to compare a duplicate against for a subtopic that doesn't
    // exist until Save.
    isPendingSection: sectionK === PENDING_SECTION_KEY,
    suggestion: ai.suggestion,
    suggestState: ai.state,
    canSuggest: ai.canSuggest,
    suggest: ai.suggest,
    acceptSuggestion,
    dismissSuggestion: ai.dismiss,
    resolveTargetSection,
  };
};

export type Placement = ReturnType<typeof usePlacement>;
