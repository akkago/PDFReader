const { parsePageContent } = require('../parsePageContent');

describe('codes 1150/11501/11502 aggregation correctness', () => {
  test('basic aggregation test works', () => {
    const pageContents = [['test', '1150', '11501', '11502']];
    const { otchetnost, error } = parsePageContent(pageContents);
    expect(error).toBeUndefined();

    expect(otchetnost.length).toBeGreaterThan(0);
    expect(otchetnost[0]).toHaveProperty('code');
    expect(otchetnost[0]).toHaveProperty('date');
    expect(otchetnost[0]).toHaveProperty('sum');
  });
});


