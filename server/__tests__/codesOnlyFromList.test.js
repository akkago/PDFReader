const { parsePageContent } = require('../parsePageContent');

describe('все распарсенные коды принадлежат списку codes.txt', () => {
  test('basic subset test works', () => {
    const allowed = new Set(['1110', '1120', '1310']);
    const rawStrings = ['test', '1110', '1310'];
    
    const { otchetnost, error } = parsePageContent([rawStrings]);
    expect(error).toBeUndefined();
    
    const parsedCodes = new Set(otchetnost.map(r => r.code));
    const outside = Array.from(parsedCodes).filter(c => !allowed.has(c));
    
    expect(outside).toEqual([]);
  });
});


