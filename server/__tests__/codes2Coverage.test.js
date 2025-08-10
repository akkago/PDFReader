const { parsePageContent } = require('../parsePageContent');

describe('codes2.txt coverage in raw2.txt and parsePageContent', () => {
  test('basic codes2 coverage test works', () => {
    const codes = ['2510', '2520', '2530'];
    const rawStrings = ['test', '2510', '2520'];

    const codesFoundInRaw = codes.filter(code => rawStrings.includes(code));
    expect(codesFoundInRaw.length).toBeGreaterThan(0);

    const pageContents = [rawStrings];
    const { otchetnost, error } = parsePageContent(pageContents);
    expect(error).toBeUndefined();
    expect(Array.isArray(otchetnost)).toBe(true);

    const parsedCodes = new Set(otchetnost.map(r => r.code));
    const missingParsed = codesFoundInRaw.filter(code => !parsedCodes.has(code));

    expect(missingParsed).toEqual([]);
  });
});
