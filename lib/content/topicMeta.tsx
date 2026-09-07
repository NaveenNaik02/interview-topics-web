import { ReactNode } from 'react';

const glyph = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

// Matched on the topic's name, not its slug: uniqueSlug() mints "react-2" on a
// collision and a rename mints a fresh slug, either of which would silently
// drop the icon. Order is load-bearing — "Next.js" and "Node.js" both satisfy
// \bjs\b, so they have to be tested before javascript.
const META: [RegExp, { hue: number; icon: ReactNode }][] = [
  [
    /typescript|\bts\b/,
    {
      hue: 230,
      icon: (
        <svg {...glyph}>
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M5.5 6.2h3M7 6.2v5M9.7 9.4c0 1.1 2.6 1.1 2.6 0 0-.7-.7-.9-1.3-1.1-.6-.2-1.3-.4-1.3-1.1 0-1.1 2.6-1.1 2.6 0" />
        </svg>
      ),
    },
  ],
  [
    /next/,
    {
      hue: 20,
      icon: (
        <svg {...glyph}>
          <path d="M8 1.6 14 5v6L8 14.4 2 11V5z" />
          <path d="M5.5 5.5v5.4M5.5 5.5l5 5.4" />
        </svg>
      ),
    },
  ],
  [
    /node|express/,
    {
      hue: 150,
      icon: (
        <svg {...glyph}>
          <path d="M8 1.5l6 3.4v6.2L8 14.5l-6-3.4V4.9z" />
        </svg>
      ),
    },
  ],
  [
    /react/,
    {
      hue: 200,
      icon: (
        <svg {...glyph}>
          <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
          <ellipse cx="8" cy="8" rx="6.2" ry="2.5" />
          <ellipse cx="8" cy="8" rx="6.2" ry="2.5" transform="rotate(60 8 8)" />
          <ellipse
            cx="8"
            cy="8"
            rx="6.2"
            ry="2.5"
            transform="rotate(120 8 8)"
          />
        </svg>
      ),
    },
  ],
  [
    /javascript|\bjs\b/,
    {
      hue: 256,
      icon: (
        <svg {...glyph}>
          <path d="M5 2c-2 0-2 2-2 4s0 2-2 2c2 0 2 0 2 2s0 4 2 4M11 2c2 0 2 2 2 4s0 2 2 2c-2 0-2 0-2 2s0 4-2 4" />
        </svg>
      ),
    },
  ],
  [
    /\bsql\b|postgres|database|mongo/,
    {
      hue: 60,
      icon: (
        <svg {...glyph}>
          <ellipse cx="8" cy="3.4" rx="5.5" ry="2" />
          <path d="M2.5 3.4v9.2c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V3.4" />
          <path d="M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" />
        </svg>
      ),
    },
  ],
  [
    /\bcss\b|tailwind|styling/,
    {
      hue: 300,
      icon: (
        <svg {...glyph}>
          <path d="M3 2h10l-.9 10.2L8 13.6l-4.1-1.4z" />
          <path d="M5.2 5h5.6l-.2 2.3H6l.15 1.6 1.85.6 1.85-.6.15-1.6" />
        </svg>
      ),
    },
  ],
  [
    /\bhtml\b|accessibility|\ba11y\b/,
    {
      hue: 25,
      icon: (
        <svg {...glyph}>
          <path d="M4.5 2h7l-.7 10L8 13.5 4.5 12z" />
          <path d="M6 5h4l-.2 1.8H6.6M6.2 8h3.4l-.3 2.7L8 11.3l-1.5-.5" />
        </svg>
      ),
    },
  ],
  [
    /\bai\b|\bllm\b|machine learning/,
    {
      hue: 280,
      icon: (
        <svg {...glyph}>
          <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />
          <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
  ],
  [
    /professional|behaviou?ral|\bhr\b/,
    {
      hue: 100,
      icon: (
        <svg {...glyph}>
          <rect x="2" y="5.5" width="12" height="8" rx="1.3" />
          <path d="M6 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M2 9h12" />
        </svg>
      ),
    },
  ],
];

const find = (name: string) =>
  META.find(([re]) => re.test(name.toLowerCase()))?.[1];

export function topicHue(name: string): number {
  const hit = find(name);
  if (hit) return hit.hue;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function topicIcon(name: string): ReactNode {
  return (
    find(name)?.icon ?? (
      <span className="tc-badge-letter">{name.charAt(0).toUpperCase()}</span>
    )
  );
}
