"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type StripDay = {
  iso: string;
  day: number;
  month: string;
  weekday: string;
};

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Evenly spaced "02 Jun" style ticks for a series of `count` days ending today. */
export function buildDateTicks(count: number, ticks = 6, endIso?: string) {
  const today = endIso ? new Date(`${endIso}T12:00:00`) : new Date();
  return Array.from({ length: ticks }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1) + Math.round((index * (count - 1)) / (ticks - 1)));
    return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleDateString("en-US", { month: "short" })}`;
  });
}

export function formatLongDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function buildDays(count: number, mode: "centered" | "past"): StripDay[] {
  const today = new Date();
  const offset = mode === "past" ? count - 1 : Math.floor(count / 2);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - offset + index);
    return {
      iso: toIso(date),
      day: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    };
  });
}

/**
 * Horizontal date rail that slides. Drag with a pointer, flick on touch, or
 * click a day; the nearest day snaps to the centre and becomes active.
 */
export function DateStrip({
  days = 21,
  mode = "centered",
  value,
  onChange,
  className,
}: {
  days?: number;
  mode?: "centered" | "past";
  value?: string;
  onChange?: (day: StripDay) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Array<HTMLButtonElement | null>>([]);
  const dragRef = useRef({ pointer: -1, startX: 0, startLeft: 0, moved: false });
  const scrollFrameRef = useRef<number | null>(null);
  const activeRef = useRef(0);

  const [items, setItems] = useState<StripDay[]>([]);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setItems(buildDays(days, mode));
    const initial = mode === "past" ? days - 1 : Math.floor(days / 2);
    activeRef.current = initial;
    setActive(initial);
  }, [days, mode]);

  const centerOn = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    const node = nodesRef.current[index];
    if (!track || !node) return;
    track.scrollTo({ left: node.offsetLeft - (track.clientWidth - node.offsetWidth) / 2, behavior });
  }, []);

  const nearestIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return activeRef.current;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = activeRef.current;
    let smallest = Number.POSITIVE_INFINITY;
    nodesRef.current.forEach((node, index) => {
      if (!node) return;
      const distance = Math.abs(node.offsetLeft + node.offsetWidth / 2 - center);
      if (distance < smallest) {
        smallest = distance;
        closest = index;
      }
    });
    return closest;
  }, []);

  const select = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const day = items[index];
      if (!day) return;
      centerOn(index, behavior);
      if (index === activeRef.current) return;
      activeRef.current = index;
      setActive(index);
      onChange?.(day);
    },
    [centerOn, items, onChange],
  );

  // Centre the initial day once the rail has rendered.
  useEffect(() => {
    if (items.length) centerOn(mode === "past" ? items.length - 1 : Math.floor(items.length / 2), "auto");
  }, [centerOn, items.length, mode]);

  // Follow a controlled value.
  useEffect(() => {
    if (!value || !items.length) return;
    const index = items.findIndex((item) => item.iso === value);
    if (index >= 0 && index !== activeRef.current) {
      activeRef.current = index;
      setActive(index);
      centerOn(index);
    }
  }, [centerOn, items, value]);

  useEffect(() => () => {
    if (scrollFrameRef.current) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  const handleScroll = () => {
    if (scrollFrameRef.current) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const index = nearestIndex();
      if (index === activeRef.current || !items[index]) return;
      activeRef.current = index;
      setActive(index);
      onChange?.(items[index]);
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || event.pointerType === "touch") return;
    dragRef.current = { pointer: event.pointerId, startX: event.clientX, startLeft: track.scrollLeft, moved: false };
    setDragging(true);
    try {
      track.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; dragging still works.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || dragRef.current.pointer !== event.pointerId) return;
    const delta = event.clientX - dragRef.current.startX;
    if (Math.abs(delta) > 3) dragRef.current.moved = true;
    track.scrollLeft = dragRef.current.startLeft - delta;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || dragRef.current.pointer !== event.pointerId) return;
    if (track.hasPointerCapture?.(event.pointerId)) track.releasePointerCapture(event.pointerId);
    dragRef.current.pointer = -1;
    setDragging(false);
    select(nearestIndex());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = Math.min(items.length - 1, Math.max(0, active + (event.key === "ArrowLeft" ? -1 : 1)));
    select(next);
  };

  if (!items.length) return <div className={cn("date-strip", className)} aria-hidden />;

  return (
    <div className={cn("date-strip", className)} data-dragging={dragging}>
      <span className="date-strip-line" aria-hidden />
      <div
        className="date-strip-track"
        ref={trackRef}
        role="listbox"
        aria-label="Select a day"
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {items.map((item, index) => {
          const distance = Math.abs(index - active);
          return (
            <button
              type="button"
              key={item.iso}
              ref={(node) => {
                nodesRef.current[index] = node;
              }}
              role="option"
              aria-selected={index === active}
              className={cn("date-node", distance === 0 && "active", distance === 1 && "near", distance > 1 && "far")}
              onClick={() => {
                if (dragRef.current.moved) return;
                select(index);
              }}
            >
              <i>
                <b />
              </i>
              <strong>{item.day}</strong>
              <small>{item.month}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
