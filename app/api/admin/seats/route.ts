import { legacyDisabledResponse } from '@/lib/legacy-disabled';

export const runtime = 'nodejs';

export async function GET() {
  return legacyDisabledResponse({
    error: 'La administración de butacas fue desactivada en BAFT porque los paquetes no usan micros ni selección de asientos.',
    code: 'LEGACY_SEATS_DISABLED',
  });
}

export async function POST() {
  return legacyDisabledResponse({
    error: 'La administración de butacas fue desactivada en BAFT porque los paquetes no usan micros ni selección de asientos.',
    code: 'LEGACY_SEATS_DISABLED',
  });
}
