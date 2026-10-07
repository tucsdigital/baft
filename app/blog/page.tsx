import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { getBlogListData } from '@/lib/blogListData';
import BlogListClient from '@/components/BlogListClient';
import { siteConfig } from '@/lib/siteConfig';
import { getLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { localizeBlogPost } from '@/lib/i18n/cms-content';

/** Sin caché: los cambios del admin (blog) se ven de inmediato */
export const revalidate = 0;

const siteUrl = SITE_URL;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const english = locale === 'en';
  const title = english ? `Blog - ${SITE_NAME}` : `Blog - ${SITE_NAME}`;
  const description = english
    ? 'News, launches and travel tips to help you travel better.'
    : 'Novedades, lanzamientos y tips para viajar mejor.';
  const localizedUrl = `${siteUrl}/${locale}/blog`;
  return {
    title,
    description,
    alternates: { canonical: localizedUrl, languages: { es: `${siteUrl}/es/blog`, en: `${siteUrl}/en/blog`, 'x-default': `${siteUrl}/es/blog` } },
    openGraph: { type: 'website', url: localizedUrl, title, description, siteName: SITE_NAME, locale: english ? 'en_US' : siteConfig.seo.locale },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BlogPage() {
  const data = await getBlogListData();
  const locale = (await getLocale()) as AppLocale;
  const posts = await Promise.all(data.posts.map((post) => localizeBlogPost(post, locale)));

  return <BlogListClient posts={posts} banners={data.banners} />;
}
