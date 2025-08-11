const { parsePageContent } = require('../parsePageContent');

describe('codes2.txt no-extra coverage', () => {
  test('никакие коды из codes2.txt, отсутствующие в raw2.txt, не появляются в parsePageContent', () => {
    const codes = ['2110', '2120', '2100', '2210', '2220', '2200', '2310', '2320', '2330', '2340', '23401', '23402', '23403', '23404', '23405', '23406', '2350', '23501', '23502', '23503', '23504', '23505', '23506', '23507', '23508', '23509', '2300', '2410', '2411', '2412', '2460', '2400', '2510', '2520', '2530', '2500', '2900', '2910'];
    const rawStrings = ['Форма 0710002 с.2', 'Пояснения', 'Наименование показателя', 'Код', 'За Январь -', 'За Январь -', 'Сентябрь 2024 г.', 'Сентябрь 2023 г.', 'Результат от переоценки внеоборотных активов, не', 'включаемый в чистую прибыль (убыток) периода', '2510', 'Результат от прочих операций, не включаемый', 'в чистую прибыль (убыток) периода', '2520', 'Налог на прибыль от операций, результат которых', '-', 'не включается в чистую прибыль (убыток) периода', '2530', 'Совокупный финансовый результат периода', '2500', '-', '7018', '2274', 'Справочно', '2900', 'Базовая прибыль (убыток) на акцию', 'Разводненная прибыль (убыток) на акцию', '-', '2910', '-', '-', '-', '', '5431', '', 'Иванова Татьяна', 'Руководитель', 'Николаевна', '(подпись)', '(расшифровка подписи)', '30 октября 2024 г.'];

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
