"use client";

import { useEffect, useRef } from "react";

/**
 * Muted looping clip that loads and plays only while on screen (no cost for visitors who never scroll there),
 * and never autoplays for people who prefer reduced motion — they get controls instead.
 */
export function LazyVideo(props: { src: string; poster: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      v.controls = true;
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          if (!v.src) v.src = props.src;
          void v.play().catch(() => {});
        } else v.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [props.src]);
  return (
    <video
      ref={ref}
      poster={props.poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={props.label}
      className={props.className}
    />
  );
}
