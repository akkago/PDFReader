const { parsePageContent } = require('../parsePageContent');

describe('codes 1170/11701 propagation correctness', () => {
  test('basic propagation test works', () => {
    const rows = [['test', '1170', '11701']];
    const { otchetnost, error } = parsePageContent(rows);
    expect(error).toBeUndefined();

    expect(otchetnost.length).toBeGreaterThan(0);
    expect(otchetnost[0]).toHaveProperty('code');
    expect(otchetnost[0]).toHaveProperty('date');
    expect(otchetnost[0]).toHaveProperty('sum');
  });
});


