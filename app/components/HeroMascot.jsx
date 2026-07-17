export default function HeroMascot() {
  return (
    <div className="hero-mascot">
      {/* animated WebP with alpha — 1.2MB vs the old 27MB gif, same look */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero.webp"
        alt="Tubby cat"
        width={406}
        height={720}
        fetchPriority="high"
        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "18px" }}
      />
    </div>
  );
}
