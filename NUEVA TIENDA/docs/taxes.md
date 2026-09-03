# 💰 Guía de Taxes para MAX-VENTAS

## ¿Cómo funciona el cálculo de taxes?

El sistema calcula el tax en el checkout basándose en la dirección del cliente (ZIP, ciudad, estado).

### Orden de búsqueda (prioridad):

1. **ZIP exacto** → Busca en `tax_rates` donde `zip` coincida exactamente
2. **Ciudad** → Si no hay ZIP, busca por `state_code` + `city`
3. **Tasa default del estado** → Si no hay ciudad, usa `is_default = true` para ese estado
4. **0%** → Si no hay nada configurado, no cobra tax

---

## California — Tasas principales (2026)

| Ciudad | Tasa combinada |
|--------|---------------|
| Default estatal | 7.25% |
| Los Angeles | 9.75% |
| San Francisco | 8.75% |
| San Diego | 7.75% |
| Santa Monica | 10.75% |
| Oakland | 10.25% |
| Sacramento | 8.75% |
| San Jose | 9.25% |

> ⚠️ California tiene la tasa estatal más alta de USA: **7.25% base**. Las ciudades y condados agregan tasas locales que pueden llevar el total hasta **10.75%**.

---

## Cómo agregar taxes de otros estados

### Opción 1: Manual (recomendado para empezar)

Ve al panel admin → **Taxes** y agrega las tasas estado por estado.

Ejemplo para Texas:
```
Estado: TX
Nombre: Texas
Tasa: 0.0625 (6.25%)
Default: ✅
```

### Opción 2: Importar masivamente

Puedes ejecutar SQL directamente en Supabase:

```sql
INSERT INTO tax_rates (state_code, state_name, city, zip, rate, is_default) VALUES
('TX','Texas',NULL,NULL,0.0625,true),
('FL','Florida',NULL,NULL,0.06,true),
('NY','New York',NULL,NULL,0.04,true),
('NV','Nevada',NULL,NULL,0.0685,true);
```

---

## Estados sin sales tax (exentos)

Estos estados NO cobran sales tax:
- Delaware
- Montana
- New Hampshire
- Oregon
- Alaska (parcial)

Para estos estados, configura la tasa default como `0.00`.

---

## Recursos útiles

- [TaxJar](https://www.taxjar.com) — API de taxes USA (gratis hasta cierto volumen)
- [Avalara](https://www.avalara.com) — API empresarial de taxes
- [California CDTFA](https://www.cdtfa.ca.gov) — Oficial de taxes de California
- [Sales Tax Institute](https://www.salestaxinstitute.com) — Referencia de tasas por estado

---

## Notas importantes

- El tax se calcula sobre el **subtotal** del carrito (sin incluir envío)
- El envío generalmente NO tiene tax en California, pero varía por estado
- Guarda siempre un registro de las tasas usadas en cada orden (ya está en la tabla `orders`)
- Actualiza las tasas anualmente — algunos estados las cambian cada julio
