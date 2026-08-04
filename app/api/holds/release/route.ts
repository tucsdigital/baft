import { legacyDisabledResponse } from '@/lib/legacy-disabled';

export const runtime = 'nodejs';

export async function POST() {
  return legacyDisabledResponse({
    error: 'La liberación de holds legacy fue desactivada en BAFT porque el flujo de carrito y butacas ya no existe.',
    code: 'LEGACY_HOLDS_DISABLED',
  });
}

