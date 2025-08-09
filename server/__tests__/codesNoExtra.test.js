const fs = require('fs');
const path = require('path');

const { parsePageContent } = require('../parsePageContent');

function loadCodes() {
  const codesPath = path.join(__dirname, '../../codes.txt');
  const text = fs.readFileSync(codesPath, 'utf8');
  return text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && /^\d{4,5}$/.test(s));
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
  if (matches.length === 0) {
    throw new Error('Failed to extract strings from raw.txt');
  }
  return matches;
}

describe('codes.txt no-extra coverage', () => {
  test('никакие коды из codes.txt, отсутствующие в raw.txt, не появляются в parsePageContent', () => {
    const codes = loadCodes();
    const rawStrings = loadRawStrings();

    const codesFoundInRaw = new Set(codes.filter(code => rawStrings.includes(code)));

    const pageContents = [rawStrings];
    const { otchetnost, error } = parsePageContent(pageContents);
    expect(error).toBeUndefined();
    expect(Array.isArray(otchetnost)).toBe(true);

    const parsedCodes = new Set(otchetnost.map(r => r.code));
    const parsedCodesWithinCodesTxt = Array.from(parsedCodes).filter(code => codes.includes(code));
    const extras = parsedCodesWithinCodesTxt.filter(code => !codesFoundInRaw.has(code));

    if (extras.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Найдены лишние коды из codes.txt, которых нет в raw.txt:', extras);
    }

    expect(extras).toEqual([]);
  });
});


