'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels';

const DEFAULT_MODEL: AqModelId = AQ_MODELS[0].id;

export interface SuggestPlacementGroup {
  groupSlug: string;
  groupName: string;
  sections: { topic: string; file: string; label: string }[];
}

export interface SuggestPlacementInput {
  title: string;
  tags?: string;
  groups: SuggestPlacementGroup[];
  model?: string;
}

export type PlacementSuggestion =
  | {
      mode: 'existing';
      groupSlug: string;
      topic: string;
      file: string;
      reasoning: string;
    }
  | {
      mode: 'new-subtopic';
      groupSlug: string;
      label: string;
      reasoning: string;
    }
  | {
      mode: 'new-topic';
      topicName: string;
      blurb: string;
      label: string;
      reasoning: string;
    };

// Serializes the curriculum with the exact identifiers (groupSlug/topic/file)
// the model must echo back for an "existing" match — keeps the response
// parseable/verifiable instead of asking it to reproduce free-text names.
function buildTree(groups: SuggestPlacementGroup[]): string {
  return groups
    .map(
      (g) =>
        `- ${g.groupName} (groupSlug: "${g.groupSlug}")\n` +
        g.sections
          .map((s) => `  - ${s.label} (topic: "${s.topic}", file: "${s.file}")`)
          .join('\n'),
    )
    .join('\n');
}

export async function suggestPlacement(
  input: SuggestPlacementInput,
): Promise<PlacementSuggestion> {
  await requireAuthor('Sign in to use AI placement');

  const apiKey = process.env.FREE_GEM_API_KEY;
  if (!apiKey) throw new Error('AI generation is not configured');

  const title = input.title.trim();
  if (title.length < 4) throw new Error('Write a question first');

  const model = AQ_MODELS.some((m) => m.id === input.model)
    ? (input.model as AqModelId)
    : DEFAULT_MODEL;

  const systemInstruction = [
    'You place a new flashcard question into an existing curriculum tree of topics and subtopics for a developer interview-prep app.',
    'Respond with ONLY minified JSON, no prose, matching exactly one of these shapes:',
    '{"mode":"existing","groupSlug":"...","topic":"...","file":"...","reasoning":"..."}',
    '{"mode":"new-subtopic","groupSlug":"...","label":"...","reasoning":"..."}',
    '{"mode":"new-topic","topicName":"...","blurb":"...","label":"...","reasoning":"..."}',
    'Prefer an existing subtopic if the question clearly fits there — copy its groupSlug/topic/file exactly from the tree below, never invent them.',
    'Only propose a new subtopic if no existing subtopic fits, using the groupSlug of the best existing topic.',
    'Only propose a new topic if no existing topic is a reasonable home at all.',
    '"label" and "topicName" are display names shown in a picker, like the existing subtopic names in the tree (e.g. "Redux", "Scalability Basics") — Title Case words with spaces, never a slug or hyphenated string.',
    'Keep reasoning under 12 words, no trailing period.',
  ].join(' ');

  const prompt = `Existing curriculum:\n${buildTree(input.groups)}\n\nNew question: "${title}"${
    input.tags?.trim() ? `\nTags: ${input.tags.trim()}` : ''
  }`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      body?.error?.message ||
        'Could not get a placement suggestion — try again.',
    );
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text)
    throw new Error('Could not get a placement suggestion — try again.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim().replace(/^```(json)?\s*|```\s*$/g, ''));
  } catch {
    throw new Error('Could not read the placement suggestion — try again.');
  }

  return validate(parsed, input.groups);
}

// The model only ever sees identifiers we handed it, but it can still
// hallucinate a slug/topic/file that doesn't exist — re-check against the
// real tree before trusting an "existing" match.
function validate(
  parsed: unknown,
  groups: SuggestPlacementGroup[],
): PlacementSuggestion {
  const bad = () =>
    new Error('Could not get a placement suggestion — try again.');
  if (!parsed || typeof parsed !== 'object') throw bad();
  const p = parsed as Record<string, unknown>;
  const reasoning = typeof p.reasoning === 'string' ? p.reasoning.trim() : '';

  if (p.mode === 'existing') {
    const groupSlug = String(p.groupSlug ?? '');
    const topic = String(p.topic ?? '');
    const file = String(p.file ?? '');
    const group = groups.find((g) => g.groupSlug === groupSlug);
    const section = group?.sections.find(
      (s) => s.topic === topic && s.file === file,
    );
    if (!group || !section) throw bad();
    return { mode: 'existing', groupSlug, topic, file, reasoning };
  }

  if (p.mode === 'new-subtopic') {
    const groupSlug = String(p.groupSlug ?? '');
    const label = String(p.label ?? '').trim();
    const group = groups.find((g) => g.groupSlug === groupSlug);
    if (!group || label.length < 2) throw bad();
    return { mode: 'new-subtopic', groupSlug, label, reasoning };
  }

  if (p.mode === 'new-topic') {
    const topicName = String(p.topicName ?? '').trim();
    const label = String(p.label ?? '').trim();
    const blurb = typeof p.blurb === 'string' ? p.blurb.trim() : '';
    if (topicName.length < 2 || label.length < 2) throw bad();
    return { mode: 'new-topic', topicName, blurb, label, reasoning };
  }

  throw bad();
}
