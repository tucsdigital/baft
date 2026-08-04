import { Timestamp, addDoc, collection, getDocs, onSnapshot, orderBy, query, where, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Categoria } from '@/types';
import { normalizeExcursionTypeValue, type ExcursionTypeOption } from '@/lib/packages/package-types';

export async function fetchActiveCategorias(): Promise<Categoria[]> {
  const categoriasQuery = query(collection(db, 'categorias'), where('activa', '==', true));
  const categoriasSnapshot = await getDocs(categoriasQuery);
  return categoriasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Categoria));
}

export async function countFeaturedPackages(excludeId?: string): Promise<number> {
  const paquetesQuery = query(collection(db, 'paquetes'), where('destacado', '==', true));
  const paquetesSnapshot = await getDocs(paquetesQuery);
  if (!excludeId) return paquetesSnapshot.size;
  return paquetesSnapshot.docs.filter((doc) => doc.id !== excludeId).length;
}

export async function fetchExcursionTypes(): Promise<ExcursionTypeOption[]> {
  const typesQuery = query(collection(db, 'excursionTypes'), orderBy('label', 'asc'));
  const snapshot = await getDocs(typesQuery);
  return mapExcursionTypesSnapshot(snapshot);
}

function mapExcursionTypesSnapshot(snapshot: QuerySnapshot<DocumentData>): ExcursionTypeOption[] {
  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as { label?: unknown; value?: unknown; active?: unknown };
      if (data.active === false) return null;

      const label = String(data.label ?? '').trim();
      const value = normalizeExcursionTypeValue(data.value ?? label);
      if (!label || !value) return null;

      return {
        id: doc.id,
        label,
        value,
      } satisfies ExcursionTypeOption;
    })
    .filter((item): item is ExcursionTypeOption => Boolean(item));
}

export function subscribeExcursionTypes(
  onChange: (items: ExcursionTypeOption[]) => void,
  onError?: (error: Error) => void
) {
  const typesQuery = query(collection(db, 'excursionTypes'), orderBy('label', 'asc'));
  return onSnapshot(
    typesQuery,
    (snapshot) => {
      onChange(mapExcursionTypesSnapshot(snapshot));
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function createExcursionType(label: string): Promise<ExcursionTypeOption> {
  const normalizedLabel = String(label ?? '').trim();
  const normalizedValue = normalizeExcursionTypeValue(normalizedLabel);

  if (!normalizedLabel || !normalizedValue) {
    throw new Error('Debes ingresar un tipo válido.');
  }

  const existingTypes = await fetchExcursionTypes();
  const existing = existingTypes.find((item) => item.value === normalizedValue);
  if (existing) return existing;

  const ref = await addDoc(collection(db, 'excursionTypes'), {
    label: normalizedLabel,
    value: normalizedValue,
    active: true,
    createdAt: Timestamp.now(),
  });

  return {
    id: ref.id,
    label: normalizedLabel,
    value: normalizedValue,
  };
}
