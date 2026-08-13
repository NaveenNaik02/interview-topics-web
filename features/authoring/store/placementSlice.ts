import type { StateCreator } from 'zustand';
import { addTopicGroup, addSection } from '@/lib/actions/topics';
import {
  findGroupForSection,
  type SectionMeta,
  type TopicGroup,
} from '@/lib/topics';
import { buildPlacementOptions, sectionKey } from '../utils/placementOptions';
import {
  PENDING_GROUP_SLUG,
  PENDING_SECTION_KEY,
  type PendingPlacement,
} from '../types';
import type { AuthoringInit, AuthoringState, PlacementSlice } from './types';

const labelOf = (options: { value: string; label: string }[], v: string) => {
  return options.find((o) => o.value === v)?.label ?? '';
};

// Everything derived from the placement selection. Pure, so both the store's
// actions and the components' memoised selector can use it.
export const derivePlacement = (
  groups: TopicGroup[],
  groupSlug: string,
  sectionK: string,
  pending: PendingPlacement | null,
) => {
  const { group, topicOptions, sectionOptions } = buildPlacementOptions(
    groups,
    groupSlug,
    pending,
  );
  const section =
    group?.sections.find((s) => sectionKey(s) === sectionK) ??
    group?.sections[0];
  return {
    group,
    section,
    topicOptions,
    sectionOptions,
    activeTopicName: labelOf(topicOptions, groupSlug),
    activeSectionLabel: labelOf(sectionOptions, sectionK),
    // Nothing to compare a duplicate against for a subtopic that doesn't
    // exist until Save.
    isPendingSection: sectionK === PENDING_SECTION_KEY,
  };
};

export const selectPlacement = (s: AuthoringState) => {
  return derivePlacement(s.groups, s.groupSlug, s.sectionK, s.pending);
};

export const createPlacementSlice = (
  init: AuthoringInit,
): StateCreator<AuthoringState, [], [], PlacementSlice> => {
  return (set, get) => {
    const { groups, initialSection } = init;
    const initialGroup = initialSection
      ? findGroupForSection(groups, initialSection)
      : null;

    return {
      groups,
      groupSlug: initialGroup?.slug ?? groups[0].slug,
      sectionK: sectionKey(
        initialSection ?? (initialGroup ?? groups[0]).sections[0],
      ),
      pending: null,

      setGroups: (groups) => set({ groups }),

      // Switching topics leaves sectionK pointing at the old topic's subtopic.
      setGroupSlug: (groupSlug) => {
        const { sectionK, pending, groups } = get();
        const { sectionOptions } = derivePlacement(
          groups,
          groupSlug,
          sectionK,
          pending,
        );
        const stillValid = sectionOptions.some((o) => o.value === sectionK);
        set({
          groupSlug,
          sectionK:
            stillValid || !sectionOptions[0]
              ? sectionK
              : sectionOptions[0].value,
        });
        get().resetDuplicate();
      },

      setSectionK: (sectionK) => {
        set({ sectionK });
        get().resetDuplicate();
      },

      // A staged topic/subtopic is created here and nowhere else — right
      // before the question that needs it — so cancelling the modal earlier
      // never leaves an empty topic/subtopic behind.
      resolveTargetSection: async (): Promise<SectionMeta> => {
        const { groupSlug, sectionK, pending } = get();
        if (groupSlug === PENDING_GROUP_SLUG && pending?.mode === 'new-topic') {
          const group = await addTopicGroup({
            groupName: pending.topicName,
            blurb: pending.blurb,
          });
          return (
            await addSection({ groupSlug: group.slug, label: pending.label })
          ).section;
        }
        if (
          sectionK === PENDING_SECTION_KEY &&
          pending?.mode === 'new-subtopic'
        ) {
          return (
            await addSection({
              groupSlug: pending.groupSlug,
              label: pending.label,
            })
          ).section;
        }
        return selectPlacement(get()).section!;
      },
    };
  };
};
