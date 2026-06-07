// Static (non-React) copy of components/ui/logo-mark.tsx — brand mark SVG
// for contexts that can't render React components: favicon and OG images
// generated via next/og's ImageResponse (Satori), which accepts <img> data URIs.

const LOGO_MARK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5BA8FF" />
      <stop offset="1" stop-color="#23B56E" />
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".22" />
      <stop offset=".5" stop-color="#fff" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7fafc" />
      <stop offset=".16" stop-color="#b7c2cb" />
      <stop offset=".34" stop-color="#697785" />
      <stop offset=".47" stop-color="#f3f8fb" />
      <stop offset=".57" stop-color="#586673" />
      <stop offset=".75" stop-color="#aeb9c3" />
      <stop offset="1" stop-color="#e9eef3" />
    </linearGradient>
    <filter id="sh" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0.5" dy="1.4" stdDeviation="1.4" flood-color="#00111a" flood-opacity="0.55" />
    </filter>
    <mask id="mk0">
      <rect x="-60" y="-60" width="120" height="120" fill="#fff" />
      <circle cx="0" cy="10.95" r="6.96" fill="#000" />
    </mask>
    <mask id="mk1">
      <rect x="-60" y="-60" width="120" height="120" fill="#fff" />
      <circle cx="0" cy="-10.95" r="6.96" fill="#000" />
    </mask>
  </defs>
  <rect x="3" y="3" width="94" height="94" rx="24" fill="url(#t)" />
  <rect x="3" y="3" width="94" height="94" rx="24" fill="url(#s)" />
  <g transform="translate(50,50) rotate(45) scale(0.84)" fill="none" stroke-linecap="round">
    <g filter="url(#sh)">
      <g mask="url(#mk0)">
        <rect x="-34" y="-13" width="40" height="26" rx="13" stroke="#39454f" stroke-width="11.6" />
        <rect x="-34" y="-13" width="40" height="26" rx="13" stroke="url(#bg)" stroke-width="9.2" />
        <rect x="-34" y="-13" width="40" height="26" rx="13" stroke="#ffffff" stroke-width="2.3" opacity=".92" transform="translate(-0.6,-1)" />
      </g>
    </g>
    <g filter="url(#sh)">
      <g mask="url(#mk1)">
        <rect x="-6" y="-13" width="40" height="26" rx="13" stroke="#39454f" stroke-width="11.6" />
        <rect x="-6" y="-13" width="40" height="26" rx="13" stroke="url(#bg)" stroke-width="9.2" />
        <rect x="-6" y="-13" width="40" height="26" rx="13" stroke="#ffffff" stroke-width="2.3" opacity=".92" transform="translate(-0.6,-1)" />
      </g>
    </g>
  </g>
</svg>`;

export const LOGO_MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_MARK_SVG).toString("base64")}`;
