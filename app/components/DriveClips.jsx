"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The clips from a past drive.
 *
 * Two behaviours worth having rather than dropping a bare <video autoplay> in:
 *
 *   - Reduced motion gets a poster and real controls instead of something that
 *     starts moving on its own. A looping clip is exactly the kind of motion
 *     that setting exists to stop.
 *   - Off-screen clips pause. Two looping videos decoding forever while the
 *     reader is six sections away is wasted battery on a phone, which is where
 *     most of this traffic will be.
 */
export default function DriveClips({ clips }) {
  const wrapRef = useRef(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) return;

    const vids = wrapRef.current?.querySelectorAll("video") ?? [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target;
          if (e.isIntersecting) {
            const p = v.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    vids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  if (!clips || !clips.length) return null;

  return (
    <div className="drive-clips" ref={wrapRef}>
      {clips.map((c) => (
        <video
          key={c.src}
          src={c.src}
          poster={c.poster}
          muted
          loop
          playsInline
          controls={reduced}
          preload="metadata"
          aria-label="A child at the centre with one of the plush cats. Face redacted at source."
        />
      ))}
    </div>
  );
}
