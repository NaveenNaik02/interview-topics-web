import { useState, useRef, useCallback } from 'react';
import type { ParsedQuestion } from '@/lib/parser';
import type { PriorityLevel } from '@/lib/offlineSync';

const DRAG_THRESHOLD = 6;

interface DragItem {
  q: ParsedQuestion;
  origIdx: number;
  priority: PriorityLevel | null;
}

interface UseSectionDragOptions {
  processed: DragItem[];
  setQuestionOrder: (order: string[]) => void;
}

export function useSectionDrag({
  processed,
  setQuestionOrder,
}: UseSectionDragOptions) {
  const listRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const activeSlotRef = useRef<number | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const shadowRef = useRef<HTMLElement | null>(null);

  const otherItemEls = useCallback(() => {
    if (!listRef.current) return [] as HTMLElement[];
    return [...listRef.current.querySelectorAll<HTMLElement>('.q-item')].filter(
      (el) => el.dataset.qid !== dragIdRef.current,
    );
  }, []);

  const slotForY = useCallback(
    (clientY: number) => {
      const items = otherItemEls();
      for (let i = 0; i < items.length; i++) {
        const r = items[i].getBoundingClientRect();
        if (clientY < r.top + r.height / 2) return i;
      }
      return items.length;
    },
    [otherItemEls],
  );

  const updateIndicator = useCallback(
    (slot: number) => {
      const container = listRef.current;
      if (!container) return;
      const items = otherItemEls();
      const containerRect = container.getBoundingClientRect();
      let top: number;
      if (items.length === 0) top = 0;
      else if (slot <= 0)
        top = items[0].getBoundingClientRect().top - containerRect.top - 6;
      else if (slot >= items.length)
        top =
          items[items.length - 1].getBoundingClientRect().bottom -
          containerRect.top +
          6;
      else {
        const rPrev = items[slot - 1].getBoundingClientRect();
        const rNext = items[slot].getBoundingClientRect();
        top = (rPrev.bottom + rNext.top) / 2 - containerRect.top;
      }
      setIndicatorTop(top);
    },
    [otherItemEls],
  );

  const handlePointerDown = useCallback(
    (id: string) => (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const target = e.target as HTMLElement;
      if (target.closest('.q-actions, .q-text, .q-body-col')) return;
      const itemEl = (e.currentTarget as HTMLElement).closest<HTMLElement>(
        '.q-item',
      );
      if (!itemEl) return;
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      let shadow: HTMLElement | null = null;
      let engaged = false;

      const engage = () => {
        engaged = true;
        const rect = itemEl.getBoundingClientRect();
        dragOffsetRef.current = { x: startX - rect.left, y: startY - rect.top };

        shadow = itemEl.cloneNode(true) as HTMLElement;
        shadow.className = `drag-shadow ${itemEl.className}`;
        shadow.style.width = `${rect.width}px`;
        shadow.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
        document.body.appendChild(shadow);
        shadowRef.current = shadow;

        const startSlot = processed.findIndex(({ q }) => q.id === id);
        dragIdRef.current = id;
        activeSlotRef.current = startSlot;
        setDragId(id);
        updateIndicator(startSlot);
      };

      const onPointerMove = (ev: PointerEvent) => {
        if (!engaged) {
          if (
            Math.hypot(ev.clientX - startX, ev.clientY - startY) <
            DRAG_THRESHOLD
          )
            return;
          engage();
        }
        const { x, y } = dragOffsetRef.current;
        shadow!.style.transform = `translate(${ev.clientX - x}px, ${ev.clientY - y}px)`;
        const slot = slotForY(ev.clientY);
        if (slot !== activeSlotRef.current) {
          activeSlotRef.current = slot;
          updateIndicator(slot);
        }
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        if (!engaged) return;
        const finalId = dragIdRef.current;
        const finalSlot = activeSlotRef.current;
        if (finalId != null && finalSlot != null) {
          const others = processed
            .map(({ q }) => q.id)
            .filter((qid) => qid !== finalId);
          others.splice(finalSlot, 0, finalId);
          setQuestionOrder(others);
        }
        if (shadowRef.current) {
          shadowRef.current.remove();
          shadowRef.current = null;
        }
        dragIdRef.current = null;
        activeSlotRef.current = null;
        setDragId(null);
        setIndicatorTop(null);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp, { once: true });
    },
    [
      processed,
      slotForY,
      updateIndicator,
      setQuestionOrder,
    ],
  );

  return {
    listRef,
    dragId,
    indicatorTop,
    handlePointerDown,
  };
}
