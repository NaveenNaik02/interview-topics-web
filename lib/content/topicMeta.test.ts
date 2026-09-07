import { describe, it, expect } from 'vitest';
import { topicHue } from './topicMeta';

// The matcher walks its list in order and takes the first hit, so a topic that
// satisfies two patterns is decided purely by which one comes first. Both
// "Next.js" and "Node.js" satisfy \bjs\b, and "TypeScript" contains "script" —
// re-sorting the list silently gives them the JavaScript icon.
describe('topic matching order', () => {
  it('keeps overlapping names on their own icon', () => {
    const js = topicHue('JavaScript');
    expect(topicHue('TypeScript')).not.toBe(js);
    expect(topicHue('Next.js')).not.toBe(js);
    expect(topicHue('Node.js')).not.toBe(js);
  });

  it('matches on name, not slug, so renames and variants still hit', () => {
    const react = topicHue('React');
    expect(topicHue('React Native')).toBe(react);
    expect(topicHue('Advanced React')).toBe(react);
  });

  it('gives unknown topics a stable hue in range', () => {
    const hue = topicHue('Kubernetes');
    expect(hue).toBe(topicHue('Kubernetes'));
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});
