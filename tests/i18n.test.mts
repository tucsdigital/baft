import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { createTranslator } from 'next-intl';

const root = new URL('../', import.meta.url);
const messages = Object.fromEntries(['es', 'en'].map(locale => [locale,
  JSON.parse(readFileSync(new URL(`messages/${locale}.json`, root), 'utf8')),
]));
function leaves(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, item]) => typeof item === 'string'
    ? [`${prefix}${key}`] : leaves(item as Record<string, unknown>, `${prefix}${key}.`));
}
const keys = Object.fromEntries(Object.entries(messages).map(([locale, data]) => [locale, new Set(leaves(data))]));

test('ES and EN have identical message paths', () => {
  assert.deepEqual([...keys.es].sort(), [...keys.en].sort());
});

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['admin', 'vendedor', 'api'].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test('public components only request existing literal translation keys', () => {
  const errors: string[] = [];
  for (const path of [...files('app'), ...files('components')]) {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const bindings = new Map<string, Set<string>>();
    function collect(node: ts.Node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const init = ts.isAwaitExpression(node.initializer) ? node.initializer.expression : node.initializer;
        if (ts.isCallExpression(init) && ts.isIdentifier(init.expression) &&
            ['useTranslations', 'getTranslations'].includes(init.expression.text) &&
            init.arguments[0] && ts.isStringLiteral(init.arguments[0])) {
          const namespaces = bindings.get(node.name.text) ?? new Set<string>();
          namespaces.add(init.arguments[0].text);
          bindings.set(node.name.text, namespaces);
        }
      }
      ts.forEachChild(node, collect);
    }
    collect(source);
    function check(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
          node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const namespaces = bindings.get(node.expression.text);
        if (namespaces) for (const locale of ['es', 'en']) {
          if (![...namespaces].some(ns => keys[locale].has(`${ns}.${(node.arguments[0] as ts.StringLiteral).text}`))) {
            errors.push(`${relative('.', path)}: ${locale}: ${[...namespaces].join('|')}.${node.arguments[0].text}`);
          }
        }
      }
      ts.forEachChild(node, check);
    }
    check(source);
  }
  assert.deepEqual(errors, [], errors.join('\n'));
});

test('home and contact messages render English without DeepL', () => {
  const errors: unknown[] = [];
  const t = createTranslator({ locale: 'en', messages: messages.en, onError: e => errors.push(e) });
  assert.equal(t('public.packagesBadge'), 'Experiences');
  assert.equal(t('public.packagesTitle'), 'Choose your next adventure');
  assert.equal(t('public.quoteServiceQuestion'), 'What would you like a quote for?');
  assert.equal(t('public.featured'), 'Featured');
  assert.equal(t('public.hours', { count: 1 }), '1 hour');
  assert.equal(t('public.hours', { count: 10 }), '10 hours');
  assert.equal(t('home.values.title', { siteName: 'BAFT' }), 'Why choose BAFT');
  for (let index = 0; index < 4; index++) t(`home.services.items.${index}.desc`);
  for (let index = 0; index < 6; index++) t(`home.values.items.${index}.desc`);
  for (let index = 0; index < 3; index++) t(`home.about.paragraphs.${index}`);
  assert.deepEqual(errors, []);
});
