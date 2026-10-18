// Sent with every page. The API sets its own stricter headers in api-server.mjs.
// HSTS is added by Caddy in production, since local builds run over plain HTTP.
// A full script CSP would need per-request nonces for Next's inline scripts, so this policy
// covers framing, plugins, base URLs and form targets.
export const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default nextConfig;
