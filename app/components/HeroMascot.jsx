"use client";

import { useEffect, useRef, useState } from "react";

// Centered hero mascot. Drop your animated cat at /public/tubby.gif and it
// shows automatically; until then it falls back to the coin art.
export default function HeroMascot() {
  const ref = useRef(null);
  const [src, setSrc] = useState("/tubby.gif");
  const fallback = () => setSrc((s) => (s !== "/coin.jpg" ? "/coin.jpg" : s));

  // covers the SSR race where the 404 fires before React attaches onError
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) fallback();
  }, [src]);

  return (
    <div className="hero-mascot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} src={src} alt="Tubby cat" onError={fallback} />
    </div>
  );
}
