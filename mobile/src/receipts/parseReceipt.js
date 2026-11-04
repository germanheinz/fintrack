// Pure receipt parser: OCR rows (one string per printed row) -> receipt data.
// Targets Spanish supermarket receipts (comma decimals, prices include tax).

const LETTER = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g;
const countLetters = (text) => (text.match(LETTER) || []).length;
const round2 = (n) => Math.round(n * 100) / 100;

// Price at the end of a row: "3,49", "1.234,56", "-1,20", "3,49 A", "3,49 €", "1,20-".
const PRICE_AT_END = /(?:^|\s)(-)?(\d{1,3}(?:\.\d{3})+,\d{2}|\d+[.,]\d{2})\s*(?:€|EUR)?\s*(?:[A-D])?\s*(-)?\s*$/i;

const DATE_RE = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/;
const ISO_DATE_RE = /(\d{4})-(\d{2})-(\d{2})/;

const NOISE_RE = new RegExp(
  [
    'subtotal', 'iva', 'igic', 'impuesto', 'cuota', '\\bbase\\b', 'cambio', 'entregad',
    'efectivo', 'tarjeta', 'visa', 'mastercard', 'contactless',
    'n[ºo°.]?\\s*(?:art|oper|ticket|factura)', 'art[ií]culos', 'c\\.?i\\.?f', 'n\\.?i\\.?f',
    'tel[eé]f', '\\btlf', '\\btel\\b', 'fecha', '\\bhora\\b', 'factura', 'ticket', 'gracias',
    'vuelva', 'www\\.', 'http', '@', 'c\\.p\\.', '\\bcaja\\b', 'terminal', 'atendid',
  ].join('|'),
  'i',
);

const DISCOUNT_RE = /\b(dto|descuento|desc|oferta|promo(?:ci[oó]n)?|cup[oó]n)\b/i;
const TOTAL_RE = /\btotal\b|a\s+pagar/i;
const NOT_A_TOTAL_RE = /iva|igic|impuest|cuota|descuent|ahorro|art[ií]culos|\bsub/i;

const toNumber = (raw) => {
  const s = raw.replace(/\s/g, '');
  return s.includes(',') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s);
};

function priceAtEnd(row) {
  const m = PRICE_AT_END.exec(row);
  if (!m) return null;
  const value = round2(toNumber(m[2]));
  return { value, negative: Boolean(m[1] || m[3]), index: m.index };
}

function findDate(rows) {
  for (const row of rows) {
    const iso = ISO_DATE_RE.exec(row);
    if (iso) return iso[0];
    const m = DATE_RE.exec(row);
    if (!m) continue;
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day < 1 || day > 31 || month < 1 || month > 12) continue;
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

function findMerchant(rows) {
  const head = rows.slice(0, 6);
  const row = head.find(
    (r) => countLetters(r) >= 3 && !priceAtEnd(r) && !NOISE_RE.test(r) && !DATE_RE.test(r),
  );
  return row ? row.slice(0, 100) : null;
}

function isTotalRow(row) {
  return TOTAL_RE.test(row) && !NOT_A_TOTAL_RE.test(row) && priceAtEnd(row) !== null;
}

function isQtyRow(text) {
  const stripped = text.replace(/\b(?:kg|uds?|und|eur)\b/gi, '').replace(/[xX*€/]/g, '');
  return /\d/.test(text) && countLetters(stripped) === 0;
}

function quantityOf(text) {
  const weight = /(\d+[.,]\d{3})\s*kg/i.exec(text);
  if (weight) return toNumber(weight[1]);
  const times = /^\s*(\d+(?:[.,]\d+)?)\s*[xX*]/.exec(text);
  return times ? toNumber(times[1]) : null;
}

const cleanName = (text) => text.replace(/\s+/g, ' ').replace(/^[\s\-.:*]+|[\s\-.:*]+$/g, '').slice(0, 255);

function parseItems(rows) {
  const items = [];
  let discount = 0;
  let pendingName = null;

  for (const row of rows) {
    if (DATE_RE.test(row)) continue;

    const price = priceAtEnd(row);
    if (!price) {
      const isName = countLetters(row) >= 3 && !NOISE_RE.test(row);
      pendingName = isName ? row : null;
      continue;
    }

    let namePart = row.slice(0, price.index).trim();

    if (price.negative || DISCOUNT_RE.test(namePart)) {
      discount += Math.abs(price.value);
      pendingName = null;
      continue;
    }
    if (NOISE_RE.test(namePart)) {
      pendingName = null;
      continue;
    }
    if (isQtyRow(namePart)) {
      if (pendingName) {
        items.push({ rawName: cleanName(pendingName), quantity: quantityOf(namePart), lineTotal: price.value });
      }
      pendingName = null;
      continue;
    }

    // "2 PAN BARRA 1,00 2,00": drop the unit price, keep the line total.
    const unit = priceAtEnd(namePart);
    if (unit && countLetters(namePart.slice(0, unit.index)) >= 2) {
      namePart = namePart.slice(0, unit.index).trim();
    }

    let quantity = null;
    const leading = /^(\d{1,2})\s+(\S.*)$/.exec(namePart);
    if (leading && countLetters(leading[2]) >= 3) {
      quantity = Number(leading[1]);
      namePart = leading[2];
    }

    pendingName = null;
    if (countLetters(namePart) < 2) continue;
    items.push({ rawName: cleanName(namePart), quantity, lineTotal: price.value });
  }

  return { items, discount: round2(discount) };
}

export function parseReceipt(rawRows) {
  const rows = rawRows.map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const warnings = [];

  const totalIndex = rows.findIndex(isTotalRow);
  const { items, discount } = parseItems(totalIndex === -1 ? rows : rows.slice(0, totalIndex));

  const itemsSum = round2(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const expected = round2(itemsSum - discount);
  const printedTotal = totalIndex === -1 ? null : priceAtEnd(rows[totalIndex]).value;

  // A later row with the same amount ("TARJETA 12,50") confirms the items.
  const confirmed = rows.slice(Math.max(totalIndex, 0)).some((row) => {
    const price = priceAtEnd(row);
    return price && !price.negative && Math.abs(price.value - expected) <= 0.02;
  });

  if (items.length === 0) warnings.push('NO_ITEMS');
  if (printedTotal === null && !confirmed) warnings.push('NO_TOTAL');
  if (printedTotal !== null && !confirmed && Math.abs(printedTotal - expected) > 0.02) {
    warnings.push('TOTAL_MISMATCH');
  }

  return {
    merchant: findMerchant(rows),
    date: findDate(rows),
    // Always the sum of the items, so the receipt is consistent by construction.
    total: expected,
    printedTotal: confirmed ? expected : printedTotal,
    discountAmount: discount,
    items,
    warnings,
  };
}
