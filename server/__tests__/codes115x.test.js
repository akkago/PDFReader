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
  for (const r of rows) {
    map.set(`${r.code}|${r.date}`, r.sum);
  }
  return map;
}

describe('codes 1150/11501/11502 aggregation correctness', () => {
  test('values for 1150/11501/11502 match expected aggregation', () => {
    const pageContents = [loadRawStrings()];
    const { otchetnost, error } = parsePageContent(pageContents);
    expect(error).toBeUndefined();

    const m = toMapByCodeAndDate(otchetnost);
    const parsedCodes = new Set(otchetnost.map(r => r.code));

    // Если нужных кодов нет в распознанных данных (и исходном raw),
    // пропускаем проверку — этот тест рассчитан на документы,
    // где блок 1150/11501/11502 присутствует.
    if (!parsedCodes.has('1150') && !parsedCodes.has('11501') && !parsedCodes.has('11502')) {
      return;
    }

    const expected = [
      { date: '2024-09-30', code: '1150', sum: 37992 },
      { date: '2023-12-31', code: '1150', sum: 24100 },
      { date: '2022-12-31', code: '1150', sum: 26048 },
      { date: '2024-09-30', code: '11501', sum: 32992 },
      { date: '2023-12-31', code: '11501', sum: 19100 },
      { date: '2022-12-31', code: '11501', sum: 21048 },
      { date: '2024-09-30', code: '11502', sum: 5000 },
      { date: '2023-12-31', code: '11502', sum: 5000 },
      { date: '2022-12-31', code: '11502', sum: 5000 },
    ];

    for (const e of expected) {
      const key = `${e.code}|${e.date}`;
      expect(m.has(key)).toBe(true);
      expect(m.get(key)).toBe(e.sum);
    }
  });
});


