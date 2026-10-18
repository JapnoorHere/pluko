import { ImageResponse } from 'next/og';

// The share card for every public page: logo, headline and one line about the product.
export const alt = 'Pluko — Every image. One API.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="17" fill="#818CF8"/><path d="M12 23v23a6 6 0 0 0 6 6h23" stroke="#171717" stroke-width="3.5" stroke-linecap="round" opacity=".45"/><path d="M35 15H24a5 5 0 0 0-5 5v20a5 5 0 0 0 5 5h20a5 5 0 0 0 5-5V29" stroke="#171717" stroke-width="3.5" stroke-linecap="round"/><path d="m21 38 9-10 7 7 5-5 7 8v2a5 5 0 0 1-5 5H24a5 5 0 0 1-5-5l2-2Z" fill="#171717"/><path d="m46 8 2.9 7.1L56 18l-7.1 2.9L46 28l-2.9-7.1L36 18l7.1-2.9L46 8Z" fill="#171717"/></svg>`;
const logoSrc = `data:image/svg+xml;base64,${Buffer.from(LOGO).toString('base64')}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', background: '#fafafa', color: '#0a0a0a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={logoSrc} width={64} height={64} alt="" />
          <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em' }}>Pluko</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', fontSize: 104, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.05em' }}>Every image. One API.</div>
          <div style={{ display: 'flex', fontSize: 34, color: '#525252', maxWidth: 900, lineHeight: 1.35 }}>Image search that returns URLs, sources and metadata your product can use.</div>
        </div>
        <div style={{ display: 'flex', height: 8, width: 160, borderRadius: 4, background: '#6366f1' }} />
      </div>
    ),
    size,
  );
}
