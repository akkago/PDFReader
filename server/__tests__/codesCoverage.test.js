const { parsePageContent } = require('../parsePageContent');

describe('codes.txt coverage in raw.txt and parsePageContent', () => {
  test('basic code parsing works', () => {
    const codes = ['1110', '1120', '1310'];
    const rawStrings = ['test', '1110', '1310'];

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


