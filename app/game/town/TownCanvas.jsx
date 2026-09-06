"use client";

// React wrapper around the Pixi town. Pixi touches `window`, so the scene is
// imported dynamically inside the effect and never during SSR — and it stays
// out of the main bundle, which matters: a slow first paint loses players
// before the game ever appears.
//
// The canvas owns the *town*; React owns every panel and menu. Taps come back
// out through `onSelect`, and per-building state (level, build progress) goes
// back in through `setBuildingState`. Nothing about the game rules lives in
// the canvas.

import { useEffect, useRef, useState } from "react";

export default function TownCanvas({ cats, buildingState, selected, napBeds, onSelect }) {
  const hostRef = useRef(null);
  const townRef = useRef(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // The cat list is rebuilt on every render of the parent, so compare by value
  // — otherwise the town tears itself down four times a second.
  const signature = cats.map((c) => `${c.rarity}|${c.art}`).join(",");

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    (async () => {
      try {
        const { createTown } = await import("./scene");
        if (cancelled) return;
        const town = await createTown(host, cats, {
          onSelect: (id) => selectRef.current?.(id),
        });
        if (cancelled) {
          town.destroy();
          return;
        }
        townRef.current = town;
        setReady(true);
      } catch (err) {
        console.error("town failed to start", err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      townRef.current?.destroy();
      townRef.current = null;
      if (host) host.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Repaint overlays whenever the game state moves.
  useEffect(() => {
    if (!ready) return;
    townRef.current?.setBuildingState(buildingState || {}, selected || null);
  }, [ready, buildingState, selected]);

  useEffect(() => {
    if (!ready || !napBeds) return;
    townRef.current?.setNapBeds(napBeds);
  }, [ready, napBeds]);

  return (
    <div className="tt-town">
      <div ref={hostRef} className="tt-town-host" />
      {!ready && !failed && <div className="tt-town-msg">Building the town…</div>}
      {failed && <div className="tt-town-msg">The town could not load here.</div>}
    </div>
  );
}
