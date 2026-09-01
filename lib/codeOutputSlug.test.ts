import { describe, it, expect } from 'vitest';
import { CODE_OUTPUT_FILE, CODE_OUTPUT_LABEL, slugify } from './topics';

// A code-output subtopic is stored with a reserved `file` instead of one
// derived from its name, so ordinary subtopics must never be able to land on
// that slug — a collision would silently turn someone's existing subtopic
// into the code-output one.
describe('code-output reserved slug', () => {
  it('is unreachable through slugify', () => {
    const candidates = [
      CODE_OUTPUT_FILE,
      CODE_OUTPUT_LABEL,
      'code output',
      'Code_Output',
      'code-output',
      'CODE  OUTPUT!!',
      'Output Questions',
    ];
    for (const name of candidates) {
      expect(slugify(name)).not.toBe(CODE_OUTPUT_FILE);
    }
  });
});
