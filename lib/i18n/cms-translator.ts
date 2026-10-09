import 'server-only';

import { createHash } from 'node:crypto';
import { after } from 'next/server';
import sanitizeHtml from 'sanitize-html';
import { adminDb } from '@/lib/firebaseAdmin';
import { createDeepLQueue } from './deepl-queue';

const TRANSLATOR_VERSION = 'deepl-v1';
const CACHE_COLLECTION = 'translationCache';
const inFlight = new Map<string, Promise<string>>();
let transport: { key: string; url: string; translate: ReturnType<typeof createDeepLQueue> } | undefined;

type TranslationOptions = {
  collection: string;
  documentId: string;
  field: string;
  source: string;
  sourceLocale?: 'es';
  targetLocale: 'es' | 'en';
  html?: boolean;
};

function cacheId(options: TranslationOptions): string {
  const contentHash = createHash('sha256').update(options.source).digest('hex').slice(0, 32);
  return [options.collection, options.documentId, options.field, options.targetLocale, contentHash, TRANSLATOR_VERSION]
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, '_'))
    .join('__');
}

function deeplUrl(): string {
  return (process.env.DEEPL_API_URL || 'https://api-free.deepl.com').replace(/\/$/, '');
}

function cleanTranslatedHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: sanitizeHtml.defaults.allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

const MEMORY_TTL_MS = 10 * 60 * 1000;
const MEMORY_MAX = 5000;
const DEADLINE_MS = 2500;
const memory = new Map<string, { value: string; expires: number }>();

function memoryGet(id: string): string | undefined {
  const hit = memory.get(id);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) { memory.delete(id); return undefined; }
  return hit.value;
}

function memorySet(id: string, value: string) {
  if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value as string);
  memory.set(id, { value, expires: Date.now() + MEMORY_TTL_MS });
}

function keepAlive(task: Promise<unknown>) {
  const safe = task.catch(() => undefined);
  try { after(() => safe); } catch { /* fuera de un request: el proceso sigue vivo */ }
}

type CacheRead = { id: string; resolve: (value: string | null) => void };
let readQueue: CacheRead[] = [];
let readScheduled = false;

async function flushReads() {
  const batch = readQueue;
  readQueue = [];
  readScheduled = false;
  const db = adminDb;
  if (!db) { batch.forEach(item => item.resolve(null)); return; }
  for (let i = 0; i < batch.length; i += 300) {
    const chunk = batch.slice(i, i + 300);
    try {
      const snaps = await db.getAll(...chunk.map(item => db.collection(CACHE_COLLECTION).doc(item.id)));
      chunk.forEach((item, index) => {
        const value = snaps[index].exists ? snaps[index].data()?.value : null;
        item.resolve(typeof value === 'string' && value.trim() ? value : null);
      });
    } catch (error) {
      console.warn('[i18n] No se pudo leer la cache de traducción:', error instanceof Error ? error.message : 'unknown');
      chunk.forEach(item => item.resolve(null));
    }
  }
}

function readCache(id: string): Promise<string | null> {
  return new Promise(resolve => {
    readQueue.push({ id, resolve });
    if (!readScheduled) { readScheduled = true; setTimeout(() => { void flushReads(); }, 2); }
  });
}

/**
 * Traduce contenido CMS únicamente en servidor. Un fallo de DeepL nunca bloquea
 * la página: siempre se devuelve el texto original como fallback. Si la
 * traducción tarda más de DEADLINE_MS se devuelve el español y la traducción
 * termina en segundo plano para quedar cacheada en la próxima visita.
 */
export async function translateCmsText(options: TranslationOptions): Promise<string> {
  const source = options.source.trim();
  if (!source || options.targetLocale === (options.sourceLocale || 'es')) return options.source;
  const id = cacheId(options);
  const cached = memoryGet(id);
  if (cached) return cached;
  let task = inFlight.get(id);
  if (!task) {
    task = translateUncached(options, id);
    inFlight.set(id, task);
    void task.finally(() => inFlight.delete(id));
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<string>(resolve => { timer = setTimeout(() => resolve(options.source), DEADLINE_MS); });
  try { return await Promise.race([task, deadline]); }
  finally { clearTimeout(timer); }
}

async function translateUncached(options: TranslationOptions, id: string): Promise<string> {
  const source = options.source.trim();
  const fromCache = await readCache(id);
  if (fromCache) { memorySet(id, fromCache); return fromCache; }

  const apiKey = process.env.DEEPL_API_KEY?.trim();
  if (!apiKey) return options.source;

  const work = (async () => {
    try {
      const url = deeplUrl();
      if (!transport || transport.key !== apiKey || transport.url !== url) {
        transport = { key: apiKey, url, translate: createDeepLQueue({ url, apiKey }) };
      }
      const translated = await transport.translate(options.source, options.html);
      const value = options.html ? cleanTranslatedHtml(translated) : translated;
      memorySet(id, value);
      if (adminDb) {
        keepAlive(adminDb.collection(CACHE_COLLECTION).doc(id).set({
          value,
          collection: options.collection,
          documentId: options.documentId,
          field: options.field,
          locale: options.targetLocale,
          sourceHash: createHash('sha256').update(source).digest('hex'),
          translatorVersion: TRANSLATOR_VERSION,
          updatedAt: new Date(),
        }).catch(error => {
          console.warn('[i18n] No se pudo guardar la cache de traducción:', error instanceof Error ? error.message : 'unknown');
        }));
      }
      return value;
    } catch (error) {
      console.warn('[i18n] Falló la traducción CMS; se usa español:', error instanceof Error ? error.message : 'unknown');
      return options.source;
    }
  })();
  keepAlive(work);
  return work;
}

export function translatedField(
  collection: string,
  documentId: string,
  field: string,
  source: string | undefined,
  targetLocale: 'es' | 'en',
  html = false,
): Promise<string> {
  return translateCmsText({ collection, documentId, field, source: source || '', targetLocale, html });
}
