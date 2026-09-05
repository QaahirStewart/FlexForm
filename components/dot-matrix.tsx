"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type DotMatrixFit = "auto" | "block";

/** Fits a series to any column count: peak-preserving when packing, linear when stretching. */
function resample(values: number[], columns: number) {
  if (values.length === columns || values.length < 2) return values;
  if (columns < values.length) {
    return Array.from({ length: columns }, (_, index) => {
      const start = Math.floor((index * values.length) / columns);
      const end = Math.max(start + 1, Math.floor(((index + 1) * values.length) / columns));
      return Math.max(...values.slice(start, end));
    });
  }
  return Array.from({ length: columns }, (_, index) => {
    const position = (index * (values.length - 1)) / Math.max(1, columns - 1);
    const low = Math.floor(position);
    const high = Math.min(values.length - 1, low + 1);
    const ratio = position - low;
    return values[low] * (1 - ratio) + values[high] * ratio;
  });
}

function useColumnCount(step: number, gap: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = (width: number) => setColumns(Math.max(6, Math.floor((width + gap) / step)));
    measure(node.clientWidth);
    const observer = new ResizeObserver((entries) => measure(entries[0].contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [gap, step]);

  return [ref, columns] as const;
}

function DotColumn({ value, max, rows }: { value: number; max: number; rows: number }) {
  const filled = Math.max(1, Math.round((value / max) * rows));
  return (
    <div className="dot-matrix-col" style={{ gridTemplateRows: `repeat(${rows}, var(--dot-size))` }}>
      {Array.from({ length: rows }, (_, row) => (
        <span key={row} className={cn("dot-cell", rows - row <= filled && "on")} />
      ))}
    </div>
  );
}

/**
 * Dot-matrix chart. `auto` packs as many dot columns as the container fits and
 * resamples the series onto them; `block` gives every value an equal dot block.
 */
export function DotMatrixChart({
  values,
  ticks,
  tickValues,
  maxValue,
  rows = 14,
  dotSize = 4,
  gap = 3,
  fit = "auto",
  className,
}: {
  values: number[];
  ticks?: string[];
  tickValues?: string[];
  maxValue?: number;
  rows?: number;
  dotSize?: number;
  gap?: number;
  fit?: DotMatrixFit;
  className?: string;
}) {
  const [plotRef, columns] = useColumnCount(dotSize + gap, gap);
  const max = maxValue ?? Math.max(...values, 1);

  const series = useMemo(() => (columns ? resample(values, columns) : []), [columns, values]);
  const span = columns ? Math.max(3, Math.floor(columns / values.length) - 2) : 0;

  const style = {
    "--dot-size": `${dotSize}px`,
    "--dot-gap": `${gap}px`,
  } as CSSProperties;

  return (
    <figure className={cn("dot-matrix", className)} style={style}>
      <div className={cn("dot-matrix-plot", fit === "block" && "blocks")} ref={plotRef} aria-hidden>
        {fit === "block"
          ? values.map((value, index) => (
              <div className="dot-matrix-block" key={index} style={{ gridTemplateColumns: `repeat(${span}, var(--dot-size))` }}>
                {Array.from({ length: span }, (_, column) => (
                  <DotColumn key={column} value={value} max={max} rows={rows} />
                ))}
              </div>
            ))
          : series.map((value, index) => <DotColumn key={index} value={value} max={max} rows={rows} />)}
      </div>
      {ticks?.length ? (
        <figcaption className={cn("dot-matrix-ticks", fit === "block" && "blocks")}>
          {ticks.map((tick, index) => (
            <span key={`${tick}-${index}`}>
              <strong>{tick}</strong>
              {tickValues?.[index] && <small>{tickValues[index]}</small>}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function DotMeter({
  value,
  left,
  right,
  columns = 42,
}: {
  value: number;
  left: string;
  right: string;
  columns?: number;
}) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * columns);
  return (
    <div className="dot-meter">
      <div className="dot-meter-labels">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div className="dot-meter-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }} aria-hidden>
        {Array.from({ length: 3 * columns }, (_, index) => (
          <span key={index} className={cn("dot-cell", index % columns < filled && "on")} />
        ))}
      </div>
    </div>
  );
}

export function DotProgress({ value, max = 10000, dots = 28 }: { value: number; max?: number; dots?: number }) {
  const filled = Math.round((Math.min(max, Math.max(0, value)) / max) * dots);
  return (
    <div className="dot-progress" style={{ gridTemplateColumns: `repeat(${dots}, 1fr)` }} aria-hidden>
      {Array.from({ length: dots }, (_, index) => (
        <span key={index} className={cn("dot-cell", index < filled && "on")} />
      ))}
    </div>
  );
}
