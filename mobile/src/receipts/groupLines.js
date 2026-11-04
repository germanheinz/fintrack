// Groups OCR text lines into printed rows using their bounding boxes.
// OCR often splits "ITEM NAME" and "PRICE" into two lines on the same row.

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};

export function groupLinesIntoRows(lines) {
  const boxed = lines
    .filter((line) => line.text && line.frame && Number.isFinite(line.frame.top))
    .map((line) => ({
      text: line.text,
      left: line.frame.left ?? 0,
      centerY: line.frame.top + (line.frame.height ?? 0) / 2,
      height: line.frame.height ?? 0,
    }));

  // Without bounding boxes, keep the order the OCR engine gave.
  if (boxed.length !== lines.length) return lines.map((line) => line.text).filter(Boolean);

  const threshold = median(boxed.map((l) => l.height)) * 0.6;
  boxed.sort((a, b) => a.centerY - b.centerY);

  const rows = [];
  for (const line of boxed) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(line.centerY - row.centerY) <= threshold) {
      row.parts.push(line);
      row.centerY = row.parts.reduce((sum, p) => sum + p.centerY, 0) / row.parts.length;
    } else {
      rows.push({ centerY: line.centerY, parts: [line] });
    }
  }

  return rows.map((row) =>
    row.parts
      .sort((a, b) => a.left - b.left)
      .map((p) => p.text)
      .join('  '),
  );
}
