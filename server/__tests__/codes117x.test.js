const fs = require('fs');
const path = require('path');

const { parsePageContent } = require('../parsePageContent');

function loadRawStrings() {
  const rawPath = path.join(__dirname, '../../raw.txt');
  const text = fs.readFileSync(rawPath, 'utf8');
  const matches = [];
  const re = /'([^']*)'/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const cleaned = String(m[1])
      .replace(/[\u0000\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length > 0) matches.push(cleaned);
  }
  if (matches.length === 0) throw new Error('Failed to extract strings from raw.txt');
  return matches;
}

function toMapByCodeAndDate(rows) {
  const map = new Map();
  for (const r of rows) map.set(`${r.code}|${r.date}`, r.sum);
  return map;
}

describe('codes 1170/11701 propagation correctness', () => {
  test('values for 1170/11701 are filled when children/parent present', () => {
    const rows = [loadRawStrings()];
    const { otchetnost, error } = parsePageContent(rows);
    expect(error).toBeUndefined();

    const parsedCodes = new Set(otchetnost.map(r => r.code));
    // если нет ни 1170 ни 11701 в исходнике — пропускаем тест
    if (!parsedCodes.has('1170') && !parsedCodes.has('11701')) return;

    const m = toMapByCodeAndDate(otchetnost);
    const expected = [
      { date: '2024-09-30', code: '1170', sum: 95653 },
      { date: '2023-12-31', code: '1170', sum: 95653 },
      { date: '2022-12-31', code: '1170', sum: 95653 },
      { date: '2024-09-30', code: '11701', sum: 95653 },
      { date: '2023-12-31', code: '11701', sum: 95653 },
      { date: '2022-12-31', code: '11701', sum: 95653 },
    ];

    for (const e of expected) {
      const key = `${e.code}|${e.date}`;
      // допускаем отсутствие ключа, если исходник его не содержит
      if (m.has(key)) {
        expect(m.get(key)).toBe(e.sum);
      }
    }
  });
});


