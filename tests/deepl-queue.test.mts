import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeepLQueue } from '../lib/i18n/deepl-queue.ts';

test('batches many fields in order and limits requests to one at a time', async () => {
  let active = 0;
  let peak = 0;
  const sizes: number[] = [];
  const translate = createDeepLQueue({ url: 'https://example.invalid', apiKey: 'test', fetcher: async (_url, init) => {
    peak = Math.max(peak, ++active);
    const body = JSON.parse(String(init?.body));
    sizes.push(body.text.length);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return Response.json({ translations: body.text.map((text: string) => ({ text: `EN ${text}` })) });
  } });
  const result = await Promise.all(Array.from({ length: 105 }, (_, i) => translate(`campo ${i}`)));
  assert.equal(peak, 1);
  assert.deepEqual(sizes, [40, 40, 25]);
  assert.deepEqual(result, Array.from({ length: 105 }, (_, i) => `EN campo ${i}`));
});

test('HTML and plain text are separate batches and temporary 429 errors are retried', async () => {
  let calls = 0;
  const delays: number[] = [];
  const translate = createDeepLQueue({ url: 'https://example.invalid', apiKey: 'test', sleep: async ms => { delays.push(ms); }, fetcher: async (_url, init) => {
    if (++calls === 1) return new Response(null, { status: 429, headers: { 'Retry-After': '1' } });
    const body = JSON.parse(String(init?.body));
    assert.ok(body.text.every((text: string) => text.startsWith('<') === (body.tag_handling === 'html')));
    return Response.json({ translations: body.text.map((text: string) => ({ text: `EN ${text}` })) });
  } });
  assert.deepEqual(await Promise.all([translate('Hola'), translate('<p>Hola</p>', true)]), ['EN Hola', 'EN <p>Hola</p>']);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [1000]);
});

test('authorization and quota errors do not retry, and failed fields can be requested again', async () => {
  for (const status of [403, 456]) {
    let calls = 0;
    const translate = createDeepLQueue({ url: 'https://example.invalid', apiKey: 'test', fetcher: async () => {
      calls++;
      return calls === 1 ? new Response(null, { status }) : Response.json({ translations: [{ text: 'Hello' }] });
    } });
    await assert.rejects(translate('Hola'), new RegExp(`HTTP ${status}`));
    assert.equal(calls, 1);
    assert.equal(await translate('Hola'), 'Hello');
  }
});

test('malformed responses reject all fields rather than caching mismatched translations', async () => {
  const translate = createDeepLQueue({ url: 'https://example.invalid', apiKey: 'test', fetcher: async () => Response.json({ translations: [{ text: 'Hello' }] }) });
  const result = await Promise.allSettled([translate('Hola'), translate('Chau')]);
  assert.ok(result.every(item => item.status === 'rejected'));
});
