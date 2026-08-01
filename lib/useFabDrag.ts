'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { create } from 'zustand'

interface Offset {
  x: number
  y: number
}

// Movement below this (px) counts as a click, not a drag — lets a slightly
// jittery tap still open the modal instead of getting swallowed.
const DRAG_THRESHOLD = 6
// Every draggable FAB carries this so clamping can consider the whole
// cluster (see clamp below), not just whichever one is being dragged — they
// sit at different default positions, so a bound computed from only the
// dragged button can push the others off-screen.
const FAB_ATTR = 'data-fab-draggable'

interface FabOffsetState {
  offset: Offset
  setOffset: (offset: Offset) => void
  reset: () => void
}

// Shared across every FAB on the page — they're visually stacked as one
// cluster (bottom-right), so dragging any single one moves them all
// together. In-memory only, deliberately not persisted: dragging is a
// per-page "get it out of the way of what's underneath it" nudge, not a
// permanent repositioning — the default bottom-right spot is the one place
// guaranteed not to cover anything else, so every fresh page (nav or
// reload) starts back there. A dedicated store (rather than the main app
// store) since this is a pure client UI concern with no server/provider
// dependency, which also sidesteps AddQuestionFab/InboxFab being rendered
// outside <DrawerProvider>/<SearchProvider> in app/layout.tsx.
const useFabOffsetStore = create<FabOffsetState>((set) => ({
  offset: { x: 0, y: 0 },
  setOffset: (offset) => set({ offset }),
  reset: () => set({ offset: { x: 0, y: 0 } }),
}))

// Makes a fixed-position FAB button draggable within the viewport for the
// current page only — navigating to a different route snaps it back to its
// default position. Spread `handlers` onto the button and apply `style` for
// the current offset. Dragging one FAB moves every FAB using this hook.
export function useFabDrag() {
  const { offset, setOffset, reset } = useFabOffsetStore()
  const pathname = usePathname()
  const dragRef = useRef<{
    startX: number
    startY: number
    origin: Offset
    moved: boolean
  } | null>(null)
  const justDraggedRef = useRef(false)

  useEffect(() => {
    reset()
  }, [pathname, reset])

  const clamp = useCallback(
    (next: Offset): Offset => {
      const els = document.querySelectorAll<HTMLElement>(`[${FAB_ATTR}]`)
      // Union of every draggable FAB's base (untransformed) box — each one's
      // current rect already reflects `offset`, so subtract that back out —
      // clamped as a group so the new offset can't push any of them, not just
      // whichever button initiated the drag, outside the viewport.
      let minLeft = Infinity,
        minTop = Infinity,
        maxRight = -Infinity,
        maxBottom = -Infinity
      els.forEach((el) => {
        const r = el.getBoundingClientRect()
        minLeft = Math.min(minLeft, r.left - offset.x)
        minTop = Math.min(minTop, r.top - offset.y)
        maxRight = Math.max(maxRight, r.right - offset.x)
        maxBottom = Math.max(maxBottom, r.bottom - offset.y)
      })
      if (!Number.isFinite(minLeft)) return next
      const minX = -minLeft
      const maxX = window.innerWidth - maxRight
      const minY = -minTop
      const maxY = window.innerHeight - maxBottom
      return {
        x: Math.min(Math.max(next.x, minX), maxX),
        y: Math.min(Math.max(next.y, minY), maxY),
      }
    },
    [offset],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origin: offset,
        moved: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [offset],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      drag.moved = true
      setOffset(clamp({ x: drag.origin.x + dx, y: drag.origin.y + dy }))
    },
    [clamp, setOffset],
  )

  const endDrag = useCallback(() => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.moved) justDraggedRef.current = true
  }, [])

  // Swallows the click that follows a real drag (pointerup still fires a
  // click) so releasing the button mid-drag doesn't also open the modal.
  const onClickCapture = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (justDraggedRef.current) {
        justDraggedRef.current = false
        e.preventDefault()
        e.stopPropagation()
      }
    },
    [],
  )

  return {
    style: { transform: `translate(${offset.x}px, ${offset.y}px)` },
    handlers: {
      [FAB_ATTR]: '',
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  }
}
