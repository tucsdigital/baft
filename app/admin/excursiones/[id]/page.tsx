import { redirect } from 'next/navigation';

export default async function AdminEditarExcursionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/paquetes/${id}`);
}
