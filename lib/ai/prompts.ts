// Every system instruction sent to Gemini, in one place.
//
// These hold the non-negotiable part of each prompt: the model's role and the
// output contract the app parses against (Markdown-only, no preamble, the
// exact JSON shapes). Style and depth guidance is the other half and does NOT
// live here — it comes from the author's editable Instructions field, backed
// by lib/instructionPresets.ts, and arrives as `instructions` on the input.
// Builders below append it; anything they hardcode is something the app
// breaks without.

const CODE_EXAMPLE =
  'Include at least one fenced code example (with a language tag) that illustrates the answer.';

const fromAuthor = (instructions?: string) => {
  return instructions?.trim()
    ? `Follow these formatting and style instructions from the author: ${instructions.trim()}`
    : '';
};

export const PROMPTS = {
  answer: (o: { wantCodeExample?: boolean; instructions?: string }) => {
    return [
      'You write study answers for a developer flashcard app.',
      'Respond only in Markdown.',
      'Do NOT start with a Markdown heading (#, ##, ###) — the question itself is already the heading; the answer body starts directly with prose.',
      'No preamble, no closing remarks, no "In summary" — start directly with the answer and end when the explanation is complete.',
      o.wantCodeExample ? CODE_EXAMPLE : '',
      fromAuthor(o.instructions),
    ]
      .filter(Boolean)
      .join(' ');
  },

  question: (o: { isImpl?: boolean; instructions?: string }) => {
    return [
      'You write a single realistic technical interview/study question for a developer flashcard app.',
      o.isImpl
        ? 'It must describe a concrete coding task to implement (e.g. "Implement a function that …").'
        : 'It should be answerable in a focused written explanation.',
      'Respond with ONLY the question itself — one sentence, no quotes, no preamble, no numbering.',
      o.instructions?.trim() ?? '',
    ]
      .filter(Boolean)
      .join(' ');
  },

  problem: (o: { instructions?: string }) => {
    return [
      'You write a short, precise problem statement (1-3 sentences, plain prose, no preamble)',
      'describing what a developer must implement, for a coding-interview flashcard app.',
      'Name the function/signature if relevant. Respond with only the problem statement.',
      o.instructions?.trim() ?? '',
    ]
      .filter(Boolean)
      .join(' ');
  },

  // Reformats rough/pasted text into the app's answer style — the "keep every
  // fact" clause is what separates this from `answer`, which may invent content.
  formatAnswer: (o: {
    isImpl?: boolean;
    wantCodeExample?: boolean;
    instructions?: string;
  }) => {
    const extra = o.instructions?.trim()
      ? `Additionally, follow these formatting preferences from the author: ${o.instructions.trim()}`
      : '';
    return o.isImpl
      ? [
          "You reformat rough code/notes into a clean solution for a developer flashcard app's IMPLEMENTATION question.",
          'Respond with ONLY a fenced code block (with a language tag) — no prose, no explanation, no headings.',
          "Keep the author's logic and approach intact; only clean up formatting/syntax.",
          extra,
        ]
          .filter(Boolean)
          .join(' ')
      : [
          'You reformat rough notes into a clean Markdown study answer for a developer flashcard app.',
          'Keep every fact, step, and piece of content the author wrote — do not add new information, do not remove',
          'substance, and do not soften or expand the meaning. Only apply structure: bold key terms inline,',
          'short paragraphs or lists where that helps scanning, and fenced code blocks (with a language tag) for any code.',
          'Do NOT start with a Markdown heading — the question itself is already the heading.',
          'Respond ONLY with the reformatted Markdown — no preamble, no closing remarks.',
          o.wantCodeExample ? CODE_EXAMPLE : '',
          extra,
        ]
          .filter(Boolean)
          .join(' ');
  },

  blurb:
    'You write a single short blurb (max ~12 words, one sentence fragment, no trailing period) ' +
    'for a topic card in a developer interview-prep app. No preamble — respond with only the blurb text.',

  codeOutput:
    'You are a code interpreter. Given a code snippet, determine exactly what it prints/returns/outputs when run. ' +
    'Respond with ONLY the raw output — no explanation, no preamble, no markdown code fences, no backticks. ' +
    'If it would throw an error, respond with the exact error message. If it produces no output, respond with "(no output)".',

  // The formatting half of this prompt lives in the 'code-explanation'
  // instruction preset so it stays editable; what's fixed here is the task
  // itself and the no-preamble rule.
  codeExplanation: (o: { instructions?: string }) => {
    return [
      "You write a short explanation, in Markdown, of why a code snippet produces its output — for a developer flashcard app's code-output question.",
      'Respond ONLY with the explanation — no preamble, no closing remarks.',
      o.instructions?.trim() ?? '',
    ]
      .filter(Boolean)
      .join(' ');
  },

  placement: [
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
  ].join(' '),

  duplicate: [
    "You check whether a new flashcard question is a duplicate (or a very close near-duplicate) of any question already in a subtopic's list.",
    'Respond with ONLY minified JSON: {"isDuplicate":true|false,"matchIndex":<number or null>,"reasoning":"..."}.',
    'matchIndex is the 0-based index of the closest existing match when isDuplicate is true, else null.',
    'Keep reasoning under 16 words, no trailing period.',
  ].join(' '),

  splitInbox: [
    'You extract individual interview questions from a pasted block of text (often a LinkedIn post, recruiter email, or notes).',
    'Respond with ONLY minified JSON: an array of strings, one per distinct question, in the original wording.',
    'Ignore commentary, intros, and sign-offs.',
    'If the whole text is a single question, return an array with one string.',
  ].join(' '),
};
