const { parsePageContent } = require('../parsePageContent');

describe('codes.txt no-extra coverage', () => {
  test('basic no-extra test works', () => {
    const codes = ['1110', '1120', '1310', '9999'];
    const rawStrings = ['test', '1110', '1310'];

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


