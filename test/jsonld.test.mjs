import test from 'node:test';
import assert from 'node:assert/strict';
import { breadcrumbs, faqPage, jsonLdScript, organization, softwareApplication } from '../lib/jsonld.js';

const ORIGIN = 'https://images.example.com';

test('organization and software use absolute URLs on the site origin', () => {
  const org = organization(ORIGIN);
  assert.equal(org.url, ORIGIN);
  assert.equal(org.logo, `${ORIGIN}/logo.png`);
  const app = softwareApplication(ORIGIN);
  assert.equal(app.softwareHelp, `${ORIGIN}/docs`);
  assert.equal(app.publisher['@id'], `${ORIGIN}/#organization`);
});

test('FAQ and breadcrumbs keep order and text', () => {
  const faq = faqPage([['Q1', 'A1'], ['Q2', 'A2']]);
  assert.equal(faq.mainEntity[1].name, 'Q2');
  assert.equal(faq.mainEntity[1].acceptedAnswer.text, 'A2');
  const crumbs = breadcrumbs([['Pluko', '/'], ['Docs', '/docs']], ORIGIN);
  assert.deepEqual(crumbs.itemListElement.map(item => [item.position, item.item]), [[1, ORIGIN], [2, `${ORIGIN}/docs`]]);
});

test('script body cannot close the script tag', () => {
  const body = jsonLdScript([faqPage([['</script><script>alert(1)</script>', 'x']])]);
  assert.ok(!body.includes('</script'));
  assert.equal(JSON.parse(body)['@graph'][0].mainEntity[0].name, '</script><script>alert(1)</script>');
});
