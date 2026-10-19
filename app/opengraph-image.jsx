import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The share card for every public page: logo, headline and one line about the product.
export const alt = 'Pluko — Every image. One API.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The logo file in public/, embedded so the image renders without a network request.
const logoSrc = `data:image/png;base64,${readFileSync(join(process.cwd(), 'public', 'logo.png')).toString('base64')}`;

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
