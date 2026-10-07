import 'server-only';

import type { BlogPost, Categoria, Paquete } from '@/types';
import { translatedField } from '@/lib/i18n/cms-translator';
import { sanitizePackageRichHtml } from '@/lib/packages/rich-text-sanitize';

export async function localizePaquete(paquete: Paquete, locale: 'es' | 'en'): Promise<Paquete> {
  if (locale === 'es') return paquete;
  const id = paquete.id || paquete.slug;
  const [titulo, descripcion, descripcionCorta, descripcionLarga, itinerario, incluye, noIncluye, destino, duracion, condiciones] = await Promise.all([
    translatedField('paquetes', id, 'titulo', paquete.titulo, locale),
    translatedField('paquetes', id, 'descripcion', paquete.descripcion, locale, true),
    translatedField('paquetes', id, 'descripcionCorta', paquete.descripcionCorta, locale),
    translatedField('paquetes', id, 'descripcionLarga', paquete.descripcionLarga, locale, true),
    translatedField('paquetes', id, 'itinerario', paquete.itinerario, locale, true),
    Promise.all((paquete.incluye || []).map((value, index) => translatedField('paquetes', id, `incluye.${index}`, value, locale))),
    Promise.all((paquete.noIncluye || []).map((value, index) => translatedField('paquetes', id, `noIncluye.${index}`, value, locale))),
    translatedField('paquetes', id, 'destino', paquete.destino, locale),
    translatedField('paquetes', id, 'duracion', paquete.duracion, locale),
    Promise.all((paquete.condiciones || []).map(async (condition, index) => ({
      titulo: await translatedField('paquetes', id, `condiciones.${index}.titulo`, condition.titulo, locale),
      texto: await translatedField('paquetes', id, `condiciones.${index}.texto`, condition.texto, locale, true),
    }))),
  ]);

  const itinerarioSteps = await Promise.all((paquete.itinerarioSteps || []).map(async (step, index) => ({
    ...step,
    titulo: await translatedField('paquetes', id, `itinerarioSteps.${index}.titulo`, step.titulo, locale),
    descripcion: sanitizePackageRichHtml(await translatedField('paquetes', id, `itinerarioSteps.${index}.descripcion`, step.descripcion, locale, true)),
  })));

  const bookingConfig = paquete.bookingConfig as (Record<string, any> | undefined);
  const rawCategories = Array.isArray(bookingConfig?.peopleCategories) ? bookingConfig!.peopleCategories : null;
  const [eventoLugar, peopleCategories] = await Promise.all([
    translatedField('paquetes', id, 'eventoLugar', paquete.eventoLugar, locale),
    rawCategories
      ? Promise.all(rawCategories.map(async (category: any, index: number) => ({
        ...category,
        label: await translatedField('paquetes', id, `bookingConfig.peopleCategories.${index}.label`, category?.label, locale),
      })))
      : Promise.resolve(null),
  ]);

  return {
    ...paquete,
    ...(paquete.eventoLugar ? { eventoLugar } : {}),
    ...(peopleCategories ? { bookingConfig: { ...bookingConfig, peopleCategories } as Paquete['bookingConfig'] } : {}),
    titulo,
    descripcion,
    descripcionCorta,
    descripcionLarga,
    itinerario,
    incluye,
    noIncluye,
    destino,
    duracion,
    condiciones,
    itinerarioSteps,
  };
}

export async function localizeCategoria(categoria: Categoria, locale: 'es' | 'en'): Promise<Categoria> {
  if (locale === 'es') return categoria;
  return {
    ...categoria,
    nombre: await translatedField('categorias', categoria.id || categoria.slug, 'nombre', categoria.nombre, locale),
    descripcion: await translatedField('categorias', categoria.id || categoria.slug, 'descripcion', categoria.descripcion, locale, true),
  };
}

export async function localizeBlogPost(post: BlogPost, locale: 'es' | 'en'): Promise<BlogPost> {
  if (locale === 'es') return post;
  return {
    ...post,
    titulo: await translatedField('blog', post.id || post.slug, 'titulo', post.titulo, locale),
    extracto: await translatedField('blog', post.id || post.slug, 'extracto', post.extracto, locale),
    contenido: await translatedField('blog', post.id || post.slug, 'contenido', post.contenido, locale, true),
  };
}
