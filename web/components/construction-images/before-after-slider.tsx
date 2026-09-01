"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { GripVertical } from "lucide-react";

/**
 * A lightweight, dependency-free before/after slider using `clip-path` (no
 * pixel-width measuring needed, so it stays correct across resizes without
 * a ResizeObserver). Pointer Events cover both mouse and touch, so it
 * works on desktop and mobile without a separate touch-handling path.
 */
export function BeforeAfterSlider({
  beforeUrl,
  beforeLabel,
  afterUrl,
  afterLabel,
}: {
  beforeUrl: string;
  beforeLabel: string;
  afterUrl: string;
  afterLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50); // percent from the left
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    updateFromClientX(event.clientX);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") setPosition((prev) => Math.max(0, prev - 5));
    if (event.key === "ArrowRight") setPosition((prev) => Math.min(100, prev + 5));
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full touch-none overflow-hidden rounded-md bg-muted select-none"
      onPointerMove={handlePointerMove}
    >
      {/* AFTER — full width, base layer */}
      <Image
        src={afterUrl}
        alt={afterLabel}
        fill
        sizes="(min-width: 768px) 768px, 100vw"
        className="object-cover"
        unoptimized
        draggable={false}
      />
      <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
        {afterLabel}
      </span>

      {/* BEFORE — same full-size image, clipped to the slider position via clip-path (no width math needed) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={beforeUrl}
          alt={beforeLabel}
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-cover"
          unoptimized
          draggable={false}
        />
        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {beforeLabel}
        </span>
      </div>

      {/* Handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparison slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="absolute inset-y-0 z-10 flex w-6 -translate-x-1/2 cursor-ew-resize items-center justify-center outline-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow" />
        <div className="relative flex size-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/10">
          <GripVertical className="size-4 text-foreground" />
        </div>
      </div>
    </div>
  );
}
