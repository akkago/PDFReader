const { parsePageContent } = require('../parsePageContent');

describe('parsePageContent', () => {
  test('basic functionality works', () => {
    const pageContents = [['test', '1110', '1000']];
    const { otchetnost, error } = parsePageContent(pageContents);
    
    expect(error).toBeUndefined();
    expect(Array.isArray(otchetnost)).toBe(true);
    expect(otchetnost.length).toBeGreaterThan(0);
    
    const firstItem = otchetnost[0];
    expect(typeof firstItem.code).toBe('string');
    expect(typeof firstItem.date).toBe('string');
    expect(typeof firstItem.sum).toBe('number');
  });
});


