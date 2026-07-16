// Faint repeating tubby-paw pattern behind everything (opacity handled in CSS).
const PAW = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" viewBox="0 0 130 130"><g fill="#331723"><ellipse cx="65" cy="78" rx="20" ry="16"/><ellipse cx="42" cy="52" rx="7" ry="10"/><ellipse cx="58" cy="42" rx="7" ry="11"/><ellipse cx="74" cy="42" rx="7" ry="11"/><ellipse cx="90" cy="52" rx="7" ry="10"/></g></svg>`;

export default function BgPattern() {
  const uri = `url("data:image/svg+xml,${encodeURIComponent(PAW)}")`;
  return <div className="bg-pattern" style={{ backgroundImage: uri }} aria-hidden="true" />;
}
