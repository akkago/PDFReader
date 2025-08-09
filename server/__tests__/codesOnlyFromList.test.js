const fs = require('fs');
const path = require('path');

const { parsePageContent } = require('../parsePageContent');

function loadCodes() {
  const codesPath = path.join(__dirname, '../../codes.txt');
  const text = fs.readFileSync(codesPath, 'utf8');
  return new Set(
    text
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && /^\d{4,5}$/.test(s))
  );
}

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

describe('все распарсенные коды принадлежат списку codes.txt', () => {
  test('parsed codes subset of codes.txt', () => {
    const allowed = loadCodes();
    const rawStrings = loadRawStrings();
    const { otchetnost, error } = parsePageContent([rawStrings]);
    expect(error).toBeUndefined();
    const parsedCodes = new Set(otchetnost.map(r => r.code));
    const outside = Array.from(parsedCodes).filter(c => !allowed.has(c));
    if (outside.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Найдены коды вне списка codes.txt:', outside);
    }
    expect(outside).toEqual([]);
  });
});


