import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Estados de USA legalmente sin Sales Tax estatal ni local
const NO_SALES_TAX_STATES = new Set(['DE', 'MT', 'NH', 'OR', 'AK']);

// Tasas estándar por estado en USA (fallback hardcodeado solo si no está en BD)
const STATE_TAX_DEFAULTS: Record<string, number> = {
  AL: 0.04, AK: 0.00, AZ: 0.056, AR: 0.065, CA: 0.0725, CO: 0.029, CT: 0.0635,
  DE: 0.00, FL: 0.07, GA: 0.04, HI: 0.04, ID: 0.06, IL: 0.0625, IN: 0.07,
  IA: 0.06, KS: 0.065, KY: 0.06, LA: 0.0445, ME: 0.055, MD: 0.06, MA: 0.0625,
  MI: 0.06, MN: 0.06875, MS: 0.07, MO: 0.04225, MT: 0.00, NE: 0.055, NV: 0.0685,
  NH: 0.00, NJ: 0.06625, NM: 0.05125, NY: 0.08875, NC: 0.0475, ND: 0.05, OH: 0.0575,
  OK: 0.045, OR: 0.00, PA: 0.06, RI: 0.07, SC: 0.06, SD: 0.045, TN: 0.07,
  TX: 0.0625, UT: 0.061, VT: 0.06, VA: 0.053, WA: 0.065, WV: 0.06, WI: 0.05, WY: 0.04,
};

export async function POST(req: NextRequest) {
  let subtotal = 0;
  try {
    const { zip, city, state, amount } = await req.json();
    const cleanState = (state || 'FL').trim().toUpperCase();
    subtotal = Number(amount) || 0;

    let rate: number | null = null;

    // Regla 0: Estados sin sales tax devuelven 0 SIEMPRE
    if (NO_SALES_TAX_STATES.has(cleanState)) {
      rate = 0;
    } else {
      try {
        const supabase = createServerClient();

        // 1. Buscar tasa exacta por ZIP en BD
        if (zip) {
          const { data: zipData } = await supabase
            .from('tax_rates')
            .select('rate')
            .eq('zip', String(zip).trim())
            .maybeSingle();

          if (zipData && zipData.rate !== null && zipData.rate !== undefined) {
            rate = Number(zipData.rate);
          }
        }

        // 2. Si rate sigue null y hay ciudad y estado: buscar por ciudad en BD
        if (rate === null && city) {
          const { data: cityRate } = await supabase
            .from('tax_rates')
            .select('rate')
            .eq('state_code', cleanState)
            .ilike('city', String(city).trim())
            .maybeSingle();

          if (cityRate && cityRate.rate !== null && cityRate.rate !== undefined) {
            rate = Number(cityRate.rate);
          }
        }

        // 3. Si rate sigue null: buscar default del estado en BD (is_default = true)
        if (rate === null) {
          const { data: defaultRate } = await supabase
            .from('tax_rates')
            .select('rate')
            .eq('state_code', cleanState)
            .eq('is_default', true)
            .maybeSingle();

          if (defaultRate && defaultRate.rate !== null && defaultRate.rate !== undefined) {
            rate = Number(defaultRate.rate);
          }
        }
      } catch (dbErr) {
        console.warn('Error consultando tax_rates en base de datos:', dbErr);
      }

      // 4. Si rate sigue null: Fallback hardcodeado estatal SOLO al final
      if (rate === null) {
        rate = STATE_TAX_DEFAULTS[cleanState] ?? 0;
      }
    }

    const finalRate = Number(rate) || 0;
    const taxAmount = Math.round(subtotal * finalRate * 100) / 100;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

    return NextResponse.json({
      rate: finalRate,
      amount: taxAmount,
      tax_amount: taxAmount,
      total: grandTotal,
    });
  } catch (error) {
    console.error('Error calculando taxes en /api/calculate-tax:', error);
    return NextResponse.json({
      rate: 0,
      amount: 0,
      tax_amount: 0,
      total: subtotal,
    });
  }
}
