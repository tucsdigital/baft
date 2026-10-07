import { MetadataRoute } from 'next';
import { collection, getDocs, query, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://viaggiotur.vercel.app';
const locales = ['es', 'en'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseRoutes = [
    { path: '', changeFrequency: 'daily' as const, priority: 1 },
    { path: '/excursiones', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/contacto', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/terminos-condiciones', changeFrequency: 'yearly' as const, priority: 0.5 },
  ];
  const routes: MetadataRoute.Sitemap = locales.flatMap((locale) => baseRoutes.map((route) => ({
    url: `${siteUrl}/${locale}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  })));

  try {
    // Obtener categorías
    const categoriasSnapshot = await getDocs(
      query(collection(db, 'categorias'), firestoreOrderBy('orden', 'asc'))
    );
    
    categoriasSnapshot.docs.forEach((doc) => {
      const categoria = doc.data();
      if (categoria.activa && categoria.slug) locales.forEach((locale) => routes.push({
        url: `${siteUrl}/${locale}/destinos/${categoria.slug}`,
        lastModified: categoria.fechaCreacion?.toDate() || new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    });

    // Obtener paquetes
    const paquetesSnapshot = await getDocs(
      query(collection(db, 'paquetes'), firestoreOrderBy('orden', 'asc'))
    );
    
    paquetesSnapshot.docs.forEach((doc) => {
      const paquete = doc.data();
      if (paquete.visible && paquete.slug) locales.forEach((locale) => routes.push({
        url: `${siteUrl}/${locale}/excursion/${paquete.slug}`,
        lastModified: paquete.fechaCreacion?.toDate() || new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  return routes;
}
