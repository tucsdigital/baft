import 'server-only';

import { createHash } from 'node:crypto';
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

/**
 * Traduce contenido CMS únicamente en servidor. Un fallo de DeepL nunca bloquea
 * la página: siempre se devuelve el texto original como fallback.
 */
export async function translateCmsText(options: TranslationOptions): Promise<string> {
  const id = cacheId(options);
  const existing = inFlight.get(id);
  if (existing) return existing;
  const task = translateUncached(options);
  inFlight.set(id, task);
  try { return await task; }
  finally { inFlight.delete(id); }
}

async function translateUncached(options: TranslationOptions): Promise<string> {
  const source = options.source.trim();
  if (!source || options.targetLocale === (options.sourceLocale || 'es')) return options.source;

  const id = cacheId(options);
  try {
    if (adminDb) {
      const cached = await adminDb.collection(CACHE_COLLECTION).doc(id).get();
      const cachedValue = cached.exists ? cached.data()?.value : null;
      if (typeof cachedValue === 'string' && cachedValue.trim()) return cachedValue;
    }
  } catch (error) {
    console.warn('[i18n] No se pudo leer la cache de traducción:', error instanceof Error ? error.message : 'unknown');
  }

  const apiKey = process.env.DEEPL_API_KEY?.trim();
  if (!apiKey) return options.source;

  try {
    const url = deeplUrl();
    if (!transport || transport.key !== apiKey || transport.url !== url) {
      transport = { key: apiKey, url, translate: createDeepLQueue({ url, apiKey }) };
    }
    const translated = await transport.translate(options.source, options.html);
    const value = options.html ? cleanTranslatedHtml(translated) : translated;

    try {
      await adminDb?.collection(CACHE_COLLECTION).doc(id).set({
        value,
        collection: options.collection,
        documentId: options.documentId,
        field: options.field,
        locale: options.targetLocale,
        sourceHash: createHash('sha256').update(source).digest('hex'),
        translatorVersion: TRANSLATOR_VERSION,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.warn('[i18n] No se pudo guardar la cache de traducción:', error instanceof Error ? error.message : 'unknown');
    }
    return value;
  } catch (error) {
    console.warn('[i18n] Falló la traducción CMS; se usa español:', error instanceof Error ? error.message : 'unknown');
    return options.source;
  }
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
