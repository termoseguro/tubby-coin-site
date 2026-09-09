"use client";

import { useEffect } from "react";

/**
 * One observer for the whole page.
 *
 * Everything animated on this site is plain CSS — the only job JS has is
 * flipping a class when an element enters the viewport, and telling the top bar
 * that the page has scrolled. That keeps the sections server-rendered (good for
 * the crawler and the OG preview) and keeps the animation budget at zero
 * dependencies: no GSAP, no Framer, nothing in the bundle.
 *
 * Mount it once, anywhere.
 */
export default function ScrollFX() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- reveal on scroll ----
    const targets = document.querySelectorAll(".reveal");
    if (reduced) {
      targets.forEach((el) => el.classList.add("in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            // stagger siblings so a grid arrives as a wave, not a slab
            const i = Number(e.target.dataset.i || 0);
            setTimeout(() => e.target.classList.add("in"), i * 80);
            io.unobserve(e.target);
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
      );
      targets.forEach((el) => io.observe(el));
      var cleanupIO = () => io.disconnect();
    }

    // ---- top bar condenses once you leave the hero ----
    const bar = document.querySelector(".bar");
    const onScroll = () => {
      if (bar) bar.classList.toggle("stuck", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (typeof cleanupIO === "function") cleanupIO();
    };
  }, []);

  return null;
}
