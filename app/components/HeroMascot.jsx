export default function HeroMascot() {
  return (
    <div className="hero-mascot">
      <video
        src="/hero-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "18px" }}
      />
    </div>
  );
}
