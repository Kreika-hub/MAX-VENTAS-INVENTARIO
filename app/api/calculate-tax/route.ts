import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Tasas estándar por estado en USA (por si no están todas en DB)
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
  try {
    const { zip, city, state, amount } = await req.json();
    const cleanState = (state || 'FL').toUpperCase();
    const subtotal = Number(amount) || 0;

    let rate = STATE_TAX_DEFAULTS[cleanState] ?? 0.07;

    try {
      const supabase = createServerClient();

      // 1. Buscar tasa exacta por ZIP
      if (zip) {
        const { data: zipData } = await supabase
          .from('tax_rates')
          .select('rate')
          .eq('zip', zip)
          .maybeSingle();

        if (zipData?.rate) rate = Number(zipData.rate);
      }

      // 2. Si no hay por ZIP, buscar por ciudad
      if (!rate && city) {
        const { data: cityRate } = await supabase
          .from('tax_rates')
          .select('rate')
          .eq('state_code', cleanState)
          .ilike('city', city)
          .maybeSingle();

        if (cityRate?.rate) rate = Number(cityRate.rate);
      }

      // 3. Fallback a tasa estatal de la DB
      if (!rate) {
        const { data: defaultRate } = await supabase
          .from('tax_rates')
          .select('rate')
          .eq('state_code', cleanState)
          .eq('is_default', true)
          .maybeSingle();

        if (defaultRate?.rate) rate = Number(defaultRate.rate);
      }
    } catch (dbErr) {
      console.warn('Usando tasa default del estado:', dbErr);
    }

    const taxAmount = Math.round(subtotal * rate * 100) / 100;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

    return NextResponse.json({
      rate,
      amount: taxAmount,
      tax_amount: taxAmount,
      total: grandTotal,
    });
  } catch (error) {
    return NextResponse.json({ rate: 0.07, amount: 0, tax_amount: 0, total: 0 });
  }
}
