import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_PAGES, pageMetadata, robotsRules, siteUrl, sitemapEntries } from '../lib/site-meta.js';
import { securityHeaders } from '../next.config.mjs';

test('site URL drops trailing slashes and has a local default', () => {
  assert.equal(siteUrl('https://images.example.com/'), 'https://images.example.com');
  assert.equal(siteUrl(''), 'http://127.0.0.1:4180');
});

test('robots.txt keeps crawlers out of the workspace and API', () => {
  const rules = robotsRules('https://images.example.com');
  for (const path of ['/app', '/admin', '/api/', '/v1/']) assert.ok(rules.rules[0].disallow.includes(path), path);
  assert.equal(rules.sitemap, 'https://images.example.com/sitemap.xml');
});

test('sitemap lists only public pages with absolute URLs', () => {
  const urls = sitemapEntries('https://images.example.com').map(entry => entry.url);
  assert.equal(urls.length, PUBLIC_PAGES.length);
  assert.ok(urls.includes('https://images.example.com'));
  assert.ok(urls.includes('https://images.example.com/docs'));
  assert.ok(urls.every(url => url.startsWith('https://images.example.com') && !/\/(app|admin)\b/.test(url)));
});

test('page metadata includes canonical link and share cards', () => {
  const meta = pageMetadata('/docs', { title: 'Docs', description: 'Read me' });
  assert.equal(meta.alternates.canonical, '/docs');
  assert.equal(meta.openGraph.url, '/docs');
  assert.equal(meta.twitter.card, 'summary_large_image');
  assert.equal(meta.openGraph.images[0].url, '/opengraph-image');
  assert.deepEqual(meta.twitter.images, ['/opengraph-image']);
});

test('pages refuse framing and sniffing', () => {
  const headers = Object.fromEntries(securityHeaders.map(({ key, value }) => [key.toLowerCase(), value]));
  assert.match(headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal(headers['x-frame-options'], 'DENY');
  assert.equal(headers['x-content-type-options'], 'nosniff');
});
