import 'server-only';

import type { BlogPost, Categoria, Paquete } from '@/types';
import { translatedField } from '@/lib/i18n/cms-translator';
import { sanitizePackageRichHtml } from '@/lib/packages/rich-text-sanitize';

export async function localizePaquete(paquete: Paquete, locale: 'es' | 'en'): Promise<Paquete> {
  if (locale === 'es') return paquete;
  const id = paquete.id || paquete.slug;
  const bookingConfig = paquete.bookingConfig as (Record<string, any> | undefined);
  const rawCategories = Array.isArray(bookingConfig?.peopleCategories) ? bookingConfig!.peopleCategories : null;

  const [titulo, descripcion, descripcionCorta, descripcionLarga, itinerario, incluye, noIncluye, destino, duracion, condiciones, itinerarioSteps, eventoLugar, peopleCategories] = await Promise.all([
    translatedField('paquetes', id, 'titulo', paquete.titulo, locale),
    translatedField('paquetes', id, 'descripcion', paquete.descripcion, locale, true),
    translatedField('paquetes', id, 'descripcionCorta', paquete.descripcionCorta, locale),
    translatedField('paquetes', id, 'descripcionLarga', paquete.descripcionLarga, locale, true),
    translatedField('paquetes', id, 'itinerario', paquete.itinerario, locale, true),
    Promise.all((paquete.incluye || []).map((value, index) => translatedField('paquetes', id, `incluye.${index}`, value, locale))),
    Promise.all((paquete.noIncluye || []).map((value, index) => translatedField('paquetes', id, `noIncluye.${index}`, value, locale))),
    translatedField('paquetes', id, 'destino', paquete.destino, locale),
    translatedField('paquetes', id, 'duracion', paquete.duracion, locale),
    Promise.all((paquete.condiciones || []).map(async (condition, index) => {
      const [titulo, texto] = await Promise.all([
        translatedField('paquetes', id, `condiciones.${index}.titulo`, condition.titulo, locale),
        translatedField('paquetes', id, `condiciones.${index}.texto`, condition.texto, locale, true),
      ]);
      return { titulo, texto };
    })),
    Promise.all((paquete.itinerarioSteps || []).map(async (step, index) => {
      const [titulo, descripcion] = await Promise.all([
        translatedField('paquetes', id, `itinerarioSteps.${index}.titulo`, step.titulo, locale),
        translatedField('paquetes', id, `itinerarioSteps.${index}.descripcion`, step.descripcion, locale, true),
      ]);
      return { ...step, titulo, descripcion: sanitizePackageRichHtml(descripcion) };
    })),
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
  const id = categoria.id || categoria.slug;
  const [nombre, descripcion] = await Promise.all([
    translatedField('categorias', id, 'nombre', categoria.nombre, locale),
    translatedField('categorias', id, 'descripcion', categoria.descripcion, locale, true),
  ]);
  return { ...categoria, nombre, descripcion };
}

export async function localizeBlogPost(post: BlogPost, locale: 'es' | 'en'): Promise<BlogPost> {
  if (locale === 'es') return post;
  const id = post.id || post.slug;
  const [titulo, extracto, contenido] = await Promise.all([
    translatedField('blog', id, 'titulo', post.titulo, locale),
    translatedField('blog', id, 'extracto', post.extracto, locale),
    translatedField('blog', id, 'contenido', post.contenido, locale, true),
  ]);
  return { ...post, titulo, extracto, contenido };
}
