const { parsePageContent } = require('../parsePageContent');

describe('codes2.txt coverage in raw2.txt and parsePageContent', () => {
  test('все коды, которые присутствуют в raw2.txt, спарсены parsePageContent', () => {
    const codes = ['2110', '2120', '2100', '2210', '2220', '2200', '2310', '2320', '2330', '2340', '23401', '23402', '23403', '23404', '23405', '23406', '2350', '23501', '23502', '23503', '23504', '23505', '23506', '23507', '23508', '23509', '2300', '2410', '2411', '2412', '2460', '2400', '2510', '2520', '2530', '2500', '2900', '2910'];
    const rawStrings = ['����� 0710002 �.2', '���������', '������������ ����������', '���', '�� ������ -', '�� ������ -', '�������� 2024 �.', '�������� 2023 �.', '��������� �� ���������� ������������ �������, ��', '���������� � ������ ������� (������) �������', '2510', '��������� �� ������ ��������, �� ����������', '� ������ ������� (������) �������', '2520', '����� �� ������� �� ��������, ��������� �������', '-', '�� ���������� � ������ ������� (������) �������', '2530', '���������� ���������� ��������� �������', '2500', '-', '7018', '2274', '���������', '2900', '������� ������� (������) �� �����', '������������ ������� (������) �� �����', '-', '2910', '-', '-', '-', '', '5431', '', '������� �������', '������������', '����������', '(�������)', '(����������� �������)', '30 ������� 2024 �.'];

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
