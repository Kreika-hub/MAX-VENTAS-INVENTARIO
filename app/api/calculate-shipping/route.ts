import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { zip, state, weight = 1, total = 0 } = await req.json();
    const cleanState = (state || 'FL').toUpperCase();
    const cleanZip = String(zip || '33134');
    const orderTotal = Number(total) || 0;
    const orderWeight = Number(weight) || 1;

    let matchedCost = 5.0;
    let matchedName = 'Tarifa Estándar';
    let isFree = false;

    try {
      const supabase = createServerClient();
      const { data: zones } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('is_active', true);

      if (zones && zones.length > 0) {
        let matchedZone = zones.find((z) =>
          z.states?.includes(cleanState) ||
          z.zip_prefixes?.some((p: string) => p && cleanZip.startsWith(p))
        );

        if (!matchedZone) {
          matchedZone = zones.find((z) => z.name === 'Rest of USA') || zones[0];
        }

        if (matchedZone) {
          matchedName = matchedZone.name;
          if (matchedZone.free_threshold && orderTotal >= Number(matchedZone.free_threshold)) {
            isFree = true;
            matchedCost = 0;
          } else {
            const base = Number(matchedZone.base_cost) || 5;
            const perLb = Number(matchedZone.cost_per_lb) || 0.5;
            matchedCost = base + (orderWeight * perLb);
          }
        }
      }
    } catch (dbErr) {
      console.warn('Usando shipping default:', dbErr);
    }

    const finalCost = isFree ? 0 : Math.round(matchedCost * 100) / 100;

    return NextResponse.json({
      cost: finalCost,
      name: matchedName,
      free: isFree,
    });
  } catch (error) {
    return NextResponse.json({ cost: 5.0, name: 'Tarifa Estándar', free: false });
  }
}
