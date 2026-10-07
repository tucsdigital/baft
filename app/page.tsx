import DevelopmentNotice from "@/components/DevelopmentNotice";
import HomeClient from "@/components/HomeClient";
import { getHomeData } from "@/lib/homeData";
import { getLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { localizeBlogPost, localizeCategoria, localizePaquete } from '@/lib/i18n/cms-content';

/** Sin caché: los cambios del admin se ven de inmediato en el front */
export const revalidate = 0;

/** Pon en true para volver a mostrar el cartel "Sitio en desarrollo" en la home */
const SHOW_DEVELOPMENT_NOTICE = false;

export default async function Home() {
  if (SHOW_DEVELOPMENT_NOTICE) {
    return <DevelopmentNotice />;
  }
  const data = await getHomeData();
  const locale = (await getLocale()) as AppLocale;
  const [paquetes, categoriasDestacadas, blogPosts] = await Promise.all([
    Promise.all(data.paquetes.map((item) => localizePaquete(item, locale))),
    Promise.all(data.categoriasDestacadas.map((item) => localizeCategoria(item, locale))),
    Promise.all(data.blogPosts.map((item) => localizeBlogPost(item, locale))),
  ]);
  const localizedPackages = new Map(paquetes.map((paquete) => [paquete.id || paquete.slug, paquete]));
  const productosOrdenados = await Promise.all(data.productosOrdenados.map(async (item) =>
    item.tipo === 'paquete' ? {
      ...item,
      paquete: localizedPackages.get(item.paquete.id || item.paquete.slug) ?? await localizePaquete(item.paquete, locale),
    } : item
  ));
  return (
    <HomeClient
      paquetes={paquetes}
      productosOrdenados={productosOrdenados}
      categoriasDestacadas={categoriasDestacadas}
      banners={data.banners}
      blogPosts={blogPosts}
    />
  );
}
