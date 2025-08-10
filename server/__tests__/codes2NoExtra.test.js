const { parsePageContent } = require('../parsePageContent');

describe('codes2.txt no-extra coverage', () => {
  test('basic codes2 no-extra test works', () => {
    const codes = ['2510', '2520', '2530', '9999'];
    const rawStrings = ['test', '2510', '2520'];

    const codesNotInRaw = codes.filter(code => !rawStrings.includes(code));
    expect(codesNotInRaw.length).toBeGreaterThan(0);

    const pageContents = [rawStrings];
    const { otchetnost, error } = parsePageContent(pageContents);
    expect(error).toBeUndefined();
    expect(Array.isArray(otchetnost)).toBe(true);

    const parsedCodes = new Set(otchetnost.map(r => r.code));
    const extraParsed = codesNotInRaw.filter(code => parsedCodes.has(code));

    expect(extraParsed).toEqual([]);
  });
});
