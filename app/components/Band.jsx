// repeated marquee text band (Toshi-style), shared by home + tokenomics
export default function Band({ text, cls }) {
  const items = new Array(14).fill(text);
  return (
    <div className={`tagline-band ${cls}`} aria-hidden="true">
      <div className="tt">
        {items.map((t, i) => (
          <span key={i}>
            {t} <b>★</b>{" "}
          </span>
        ))}
      </div>
    </div>
  );
}
