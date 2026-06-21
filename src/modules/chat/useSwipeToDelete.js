import { useEffect, useRef, useState } from 'react';

export const SWIPE_MAX = 100;
export const DELETE_THRESHOLD = 56;

function clampSwipe(value) {
  return Math.min(0, Math.max(-SWIPE_MAX, value));
}

export function useSwipeToDelete({ itemId, onDelete, onTap }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);

  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const removingRef = useRef(false);
  const onDeleteRef = useRef(onDelete);
  const onTapRef = useRef(onTap);
  const itemIdRef = useRef(itemId);

  onDeleteRef.current = onDelete;
  onTapRef.current = onTap;
  itemIdRef.current = itemId;

  function applyOffset(value) {
    const next = clampSwipe(value);
    offsetRef.current = next;
    setOffset(next);
  }

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;

    let startX = 0;
    let startOffset = 0;
    let activePointerId = null;
    let moved = false;

    function finishDrag() {
      if (!draggingRef.current || removingRef.current) return;

      draggingRef.current = false;
      setDragging(false);
      activePointerId = null;

      const currentOffset = offsetRef.current;

      if (Math.abs(currentOffset) >= DELETE_THRESHOLD) {
        removingRef.current = true;
        setRemoving(true);
        applyOffset(-SWIPE_MAX);
        window.setTimeout(() => onDeleteRef.current?.(itemIdRef.current), 200);
        return;
      }

      applyOffset(0);

      if (!moved && onTapRef.current) {
        onTapRef.current();
      }
    }

    function onPointerMove(event) {
      if (!draggingRef.current || event.pointerId !== activePointerId) return;
      event.preventDefault();

      const delta = event.clientX - startX;
      if (Math.abs(delta) > 4) moved = true;

      const next = startOffset + delta;
      applyOffset(next > 0 ? 0 : next);
    }

    function onPointerEnd(event) {
      if (event.pointerId !== activePointerId) return;

      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerEnd);
      document.removeEventListener('pointercancel', onPointerEnd);

      finishDrag();
    }

    function onPointerDown(event) {
      if (removingRef.current) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      moved = false;
      draggingRef.current = true;
      setDragging(true);
      activePointerId = event.pointerId;
      startX = event.clientX;
      startOffset = offsetRef.current;

      document.addEventListener('pointermove', onPointerMove, { passive: false });
      document.addEventListener('pointerup', onPointerEnd);
      document.addEventListener('pointercancel', onPointerEnd);
    }

    el.addEventListener('pointerdown', onPointerDown);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerEnd);
      document.removeEventListener('pointercancel', onPointerEnd);
    };
  }, [itemId]);

  const progress = Math.min(1, Math.abs(offset) / DELETE_THRESHOLD);
  const revealDelete = progress > 0.04;

  return {
    trackRef,
    offset,
    dragging,
    removing,
    revealDelete,
  };
}
