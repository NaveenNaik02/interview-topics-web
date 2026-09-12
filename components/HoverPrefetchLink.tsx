'use client';

import Link from 'next/link';
import { ComponentProps, useState } from 'react';

// Prefetching starts on hover instead of on viewport entry: every route here is
// dynamic, so a viewport prefetch would fire a full server render per link just
// from scrolling. `true` rather than Next's `null` — auto only prefetches a
// dynamic route down to its loading boundary, which is the skeleton, not data.
export const HoverPrefetchLink = (props: ComponentProps<typeof Link>) => {
  const [warm, setWarm] = useState(false);

  return (
    <Link {...props} prefetch={warm} onMouseEnter={() => setWarm(true)} />
  );
};
