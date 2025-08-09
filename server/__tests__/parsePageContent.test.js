const fs = require('fs');
const path = require('path');

const { parsePageContent } = require('../parsePageContent');

function loadRawTxtAsArray() {
  const rawPath = path.join(__dirname, '../../raw.txt');
  const text = fs.readFileSync(rawPath, 'utf8');
  // raw.txt holds a single line with JS-like array, but it contains mojibake.
  // Extract strings between single quotes instead of JSON parsing.
  const matches = [];
  const re = /'([^']*)'/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    matches.push(m[1]);
  }
  if (matches.length === 0) {
    throw new Error('Failed to extract strings from raw.txt');
  }
  return [matches];
}

describe('parsePageContent', () => {
  test('parses otchetnost and returns multiple N items (structure like norm.txt)', () => {
    const pageContents = loadRawTxtAsArray();
    const { otchetnost, error } = parsePageContent(pageContents);
    expect(error).toBeUndefined();
    expect(Array.isArray(otchetnost)).toBe(true);
    expect(otchetnost.length).toBeGreaterThan(0);

    // Structure like norm.txt
    for (const row of otchetnost) {
      expect(typeof row.code).toBe('string');
      expect(/^\d{4,5}$/.test(row.code)).toBe(true);
      expect(typeof row.date).toBe('string');
      expect(row.date.length).toBeGreaterThanOrEqual(7); // YYYY-MM
      expect(typeof row.sum).toBe('number');
      expect(row.sum).toBeGreaterThanOrEqual(0);
    }

    // Ensure multiple dates (columns) are produced
    const actualDates = Array.from(new Set(otchetnost.map(i => i.date)));
    expect(actualDates.length).toBeGreaterThanOrEqual(2);
    expect(actualDates.length).toBeLessThanOrEqual(3);

    // Ensure multiple codes are processed
    const actualCodes = Array.from(new Set(otchetnost.map(i => i.code)));
    expect(actualCodes.length).toBeGreaterThanOrEqual(10);

    // Spot-check that some known codes from raw.txt are present
    const expectedSomeCodes = ['1310','1320','1340','1350','1360','1370','1300','1410','1510','1520','15201','1700'];
    const present = expectedSomeCodes.filter(c => actualCodes.includes(c));
    expect(present.length).toBeGreaterThan(5);

    // Ensure entries count >= codes * dates (up to the internal cap)
    expect(otchetnost.length).toBeGreaterThanOrEqual(actualCodes.length * Math.min(actualDates.length, 3));
  });
});


