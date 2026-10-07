type Job = { text: string; html: boolean; resolve: (text: string) => void; reject: (error: Error) => void };
type Options = {
  url: string;
  apiKey: string;
  fetcher?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

/** Server-side transport: bounded batches avoid one HTTP request per CMS field. */
export function createDeepLQueue({ url, apiKey, fetcher = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) }: Options) {
  const pending: Job[] = [];
  let running = false;
  let scheduled = false;
  const bodyFor = (jobs: Job[]) => JSON.stringify({
    text: jobs.map(job => job.text), source_lang: 'ES', target_lang: 'EN-US',
    ...(jobs[0].html ? { tag_handling: 'html', split_sentences: 'nonewlines' } : {}),
  });

  async function send(jobs: Job[]): Promise<string[]> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetcher(`${url}/v2/translate`, {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'content-type': 'application/json' },
        body: bodyFor(jobs), cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const transient = response.status === 429 || response.status >= 500;
        if (transient && attempt < 3) {
          const retry = response.headers.get('retry-after');
          const seconds = retry === null ? NaN : Number(retry);
          const requested = Number.isFinite(seconds) ? seconds * 1000 : retry ? Date.parse(retry) - Date.now() : 0;
          await response.body?.cancel();
          // Long provider cooldowns fall back instead of holding a render indefinitely.
          if (requested > 10000) throw new Error(`DeepL HTTP ${response.status}: cooldown`);
          await sleep(Math.max(500 * 2 ** attempt, Number.isFinite(requested) ? requested : 0));
          continue;
        }
        await response.body?.cancel();
        throw new Error(`DeepL HTTP ${response.status}`);
      }
      const payload = await response.json() as { translations?: { text?: string }[] };
      if (payload.translations?.length !== jobs.length || payload.translations.some(item => !item.text?.trim())) {
        throw new Error('DeepL: incomplete translation batch');
      }
      return payload.translations.map(item => item.text!.trim());
    }
  }

  async function drain() {
    scheduled = false;
    if (running) return;
    running = true;
    try {
      while (pending.length) {
        const jobs = [pending.shift()!];
        for (let index = 0; index < pending.length && jobs.length < 40;) {
          const candidate = pending[index];
          if (candidate.html !== jobs[0].html || Buffer.byteLength(bodyFor([...jobs, candidate]), 'utf8') > 96000) {
            index++;
          } else {
            jobs.push(...pending.splice(index, 1));
          }
        }
        try {
          if (Buffer.byteLength(bodyFor(jobs), 'utf8') > 128000) throw new Error('DeepL: text exceeds request limit');
          const translations = await send(jobs);
          jobs.forEach((job, index) => job.resolve(translations[index]));
        } catch (error) {
          // Do not retry uncertain network failures: the provider may already have billed them.
          const safeError = new Error(error instanceof Error && error.message.startsWith('DeepL') ? error.message : 'DeepL: network or timeout error');
          jobs.forEach(job => job.reject(safeError));
        }
      }
    } finally { running = false; }
  }

  return (text: string, html = false): Promise<string> => new Promise((resolve, reject) => {
    pending.push({ text, html, resolve, reject });
    if (!running && !scheduled) {
      scheduled = true;
      setTimeout(() => { void drain(); }, 25);
    }
  });
}
