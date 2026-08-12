import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { addTopicGroup, addSection } from '@/lib/actions/topics';
import { findGroupForSection, type SectionMeta } from '@/lib/topics';
import {
  suggestPlacement,
  type PlacementSuggestion,
} from '@/lib/actions/suggestPlacement';
import type { AqModelId } from '@/lib/aiModels';
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

const sectionKey = (s: SectionMeta) => `${s.topic}/${s.file}`;

// Everything about where the question is filed: the selected topic/subtopic,
// the options the two pickers render, the AI's placement suggestion, and any
// topic/subtopic staged by an accepted suggestion but not created yet.
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
  const isPendingGroup = groupSlug === PENDING_GROUP_SLUG;
  const group = isPendingGroup
    ? null
    : (groups.find((g) => g.slug === groupSlug) ?? groups[0]);

  // Lazy initializer: evaluated once at mount, when groupSlug can't yet be
  // the pending-topic sentinel — safe to assume a real group here.
  const [sectionK, setSectionK] = useState(() => {
    if (initialSection) return sectionKey(initialSection);
    const mountGroup = groups.find((g) => g.slug === groupSlug) ?? groups[0];
    return sectionKey(mountGroup.sections[0]);
  });
  const section =
    group?.sections.find((s) => sectionKey(s) === sectionK) ??
    group?.sections[0];

  // A suggestion staged via "Use this placement" for a topic/subtopic that
  // doesn't exist yet — surfaced as a synthetic option (below) and only
  // created for real in resolveTargetSection, so cancelling the modal
  // leaves no orphaned topic/subtopic behind.
  const [pendingPlacement, setPendingPlacement] =
    useState<PendingPlacement | null>(null);

  const pendingTopic =
    pendingPlacement?.kind === 'new-topic' ? pendingPlacement : null;
  const pendingSubtopicForGroup =
    pendingPlacement?.kind === 'new-subtopic' &&
    pendingPlacement.groupSlug === groupSlug
      ? pendingPlacement
      : null;

  const topicOptions = [
    ...groups.map((g) => ({ value: g.slug, label: g.groupName })),
    ...(pendingTopic
      ? [
          {
            value: PENDING_GROUP_SLUG,
            label: pendingTopic.topicName,
            sub: 'new',
          },
        ]
      : []),
  ];
  const sectionOptions =
    pendingTopic && isPendingGroup
      ? [{ value: PENDING_SECTION_KEY, label: pendingTopic.label, sub: 'new' }]
      : [
          ...(group?.sections ?? []).map((s) => ({
            value: sectionKey(s),
            label: s.label,
          })),
          ...(pendingSubtopicForGroup
            ? [
                {
                  value: PENDING_SECTION_KEY,
                  label: pendingSubtopicForGroup.label,
                  sub: 'new',
                },
              ]
            : []),
        ];
  const activeTopicName =
    isPendingGroup && pendingTopic
      ? pendingTopic.topicName
      : (group?.groupName ?? '');
  const activeSectionLabel =
    sectionK === PENDING_SECTION_KEY && pendingPlacement
      ? pendingPlacement.label
      : (section?.label ?? '');

  useEffect(() => {
    if (sectionOptions.some((o) => o.value === sectionK)) return;
    if (sectionOptions[0]) setSectionK(sectionOptions[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSlug]);

  const [suggestion, setSuggestion] = useState<PlacementSuggestion | null>(
    null,
  );
  const [suggestState, setSuggestState] = useState<
    'idle' | 'loading' | 'error'
  >('idle');

  const suggest = async () => {
    setSuggestState('loading');
    setSuggestion(null);
    try {
      setSuggestion(
        await suggestPlacement({
          title,
          tags,
          groups: groups.map((g) => ({
            groupSlug: g.slug,
            groupName: g.groupName,
            sections: g.sections.map((s) => ({
              topic: s.topic,
              file: s.file,
              label: s.label,
            })),
          })),
          model,
        }),
      );
      setSuggestState('idle');
    } catch {
      setSuggestState('error');
    }
  };

  // Accepting a suggestion always clears it — the card's job is done once the
  // pickers reflect it.
  const acceptSuggestion = () => {
    if (!suggestion) return;
    if (suggestion.mode === 'existing') {
      setPendingPlacement(null);
      setGroupSlug(suggestion.groupSlug);
      setSectionK(`${suggestion.topic}/${suggestion.file}`);
    } else if (suggestion.mode === 'new-subtopic') {
      setPendingPlacement({
        kind: 'new-subtopic',
        groupSlug: suggestion.groupSlug,
        label: suggestion.label,
      });
      setGroupSlug(suggestion.groupSlug);
      setSectionK(PENDING_SECTION_KEY);
    } else {
      setPendingPlacement({
        kind: 'new-topic',
        topicName: suggestion.topicName,
        blurb: suggestion.blurb,
        label: suggestion.label,
      });
      setGroupSlug(PENDING_GROUP_SLUG);
      setSectionK(PENDING_SECTION_KEY);
    }
    setSuggestion(null);
  };

  // A staged new topic/subtopic only gets created here, right before saving
  // the question that needs it — so cancelling out of the modal earlier
  // never leaves an empty topic/subtopic behind.
  const resolveTargetSection = async (): Promise<SectionMeta> => {
    if (isPendingGroup && pendingPlacement?.kind === 'new-topic') {
      const newGroup = await addTopicGroup({
        groupName: pendingPlacement.topicName,
        blurb: pendingPlacement.blurb,
      });
      return (
        await addSection({
          groupSlug: newGroup.slug,
          label: pendingPlacement.label,
        })
      ).section;
    }
    if (
      sectionK === PENDING_SECTION_KEY &&
      pendingPlacement?.kind === 'new-subtopic'
    ) {
      return (
        await addSection({
          groupSlug: pendingPlacement.groupSlug,
          label: pendingPlacement.label,
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
    activeTopicName,
    activeSectionLabel,
    // Nothing to compare a duplicate against for a subtopic that doesn't
    // exist until Save.
    isPendingSection: sectionK === PENDING_SECTION_KEY,
    suggestion,
    suggestState,
    canSuggest: title.trim().length > 3 && suggestState !== 'loading',
    suggest,
    acceptSuggestion,
    dismissSuggestion: () => setSuggestion(null),
    resolveTargetSection,
  };
};

export type Placement = ReturnType<typeof usePlacement>;
