export default function HeroMascot() {
  return (
    <div className="hero-mascot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-video.gif"
        alt="Tubby cat"
        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "18px" }}
      />
    </div>
  );
}
