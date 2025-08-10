const { parsePageContent } = require('../parsePageContent');

describe('paddleocr integration test', () => {
  test('parsePageContent should process paddleocr.log data correctly', () => {
    // Данные из paddleocr.log
    const paddleocrData = [
      ' ',
      ' 30  2024.',
      '',
      '',
      '0710001',
      ' (, , )',
      '30',
      '09',
      '2024',
      '',
      '  ""',
      '',
      '57932545',
      '',
      'HH',
      '7805235431',
      ' ',
      '  , ',
      '',
      ' 2',
      '43.99.5',
      '',
      ' ',
      '-  / ',
      ' ',
      '12267',
      '16',
      '',
      '  /',
      '/ ',
      ' :',
      ' . ',
      '',
      '384',
      ' ()',
      '191180, -, ,  67, ,  14',
      '    ',
      '',
      'HET',
      '  /, ,  ()  ',
      '    /',
      'IHH',
      '',
      '    ',
      '/',
      '',
      '',
      '',
      ' 30 ',
      ' 31',
      ' 31',
      '',
      ' ',
      '2024.',
      '2023.',
      '2022r.',
      '',
      'I.  ',
      ' ',
      '1110',
      '-',
      '  ',
      '1120',
      '-',
      '-',
      '-',
      '  ',
      '1130',
      '-',
      '-',
      '-',
      '  ',
      '1140',
      '-',
      '-',
      ' ',
      '1150',
      '37 992',
      '24100',
      '26 048',
      '  :',
      '  ',
      '11501',
      '32 992',
      '19 100',
      '21 048',
      '  ',
      '11502',
      '5000',
      '5000',
      '5000',
      '  ',
      '1160',
      '',
      '.',
      '-',
      ' ',
      '1170',
      '95653',
      '95653',
      '95653',
      '  :',
      '',
      '11701',
      '95653',
      '95653',
      '95653',
      '  ',
      '1180',
      '-',
      '-',
      '-',
      '  ',
      '1190',
      '-',
      '-',
      ' 1',
      '1100',
      '133645',
      '119 753',
      '121701',
      'II.  ',
      '',
      '1210',
      '1 404 416',
      '919 272',
      '852699',
      '  :',
      '',
      '12101',
      '97 528',
      '78 834',
      '78 580',
      '',
      '12102',
      '5467',
      '5 467',
      '188',
      ' ',
      '12103',
      '1301 421',
      '834 971',
      '773 931',
      '  ',
      '1220',
      ' ',
      '723',
      '-',
      '-',
      '  :',
      ' ',
      '12201',
      '-',
      '696',
      '-',
      '-'
    ];

    // Ожидаемый результат из res.txt (основные коды с суммами)
    const expectedCodes = {
      '1110': [0, 0, 0],
      '1120': [0, 0, 0],
      '1130': [0, 0, 0],
      '1140': [0, 0, 0],
      '1150': [37992, 24100, 26048],
      '11501': [32992, 19100, 21048],
      '11502': [5000, 5000, 5000],
      '1160': [0, 0, 0],
      '1170': [95653, 95653, 95653],
      '11701': [95653, 95653, 95653],
      '1180': [0, 0, 0],
      '1190': [0, 0, 0],
      '1100': [133645, 119753, 121701],
      '1210': [1404416, 919272, 852699],
      '12101': [97528, 78834, 78580],
      '12102': [5467, 5467, 188],
      '12103': [1301421, 834971, 773931],
      '1220': [723, 0, 0],
      '12201': [0, 696, 0],
      '12202': [27, 0, 0]
    };

    const { otchetnost, error } = parsePageContent([paddleocrData]);
    
    expect(error).toBeUndefined();
    expect(Array.isArray(otchetnost)).toBe(true);
    expect(otchetnost.length).toBeGreaterThan(0);

    // Проверяем структуру результата
    const firstItem = otchetnost[0];
    expect(firstItem).toHaveProperty('date');
    expect(firstItem).toHaveProperty('code');
    expect(firstItem).toHaveProperty('sum');
    expect(typeof firstItem.date).toBe('string');
    expect(typeof firstItem.code).toBe('string');
    expect(typeof firstItem.sum).toBe('number');

    // Проверяем, что найдены основные коды
    const foundCodes = new Set(otchetnost.map(item => item.code));
    
    // Проверяем наличие ключевых кодов
    const keyCodes = ['1110', '1150', '11501', '11502', '1170', '11701', '1100', '1210'];
    for (const code of keyCodes) {
      expect(foundCodes.has(code)).toBe(true);
    }

    // Проверяем суммы для основных кодов с допуском
    for (const [code, expectedSums] of Object.entries(expectedCodes)) {
      const codeItems = otchetnost.filter(item => item.code === code);
      if (codeItems.length > 0) {
        const actualSums = codeItems.map(item => item.sum);
        
        // Проверяем с допуском ±10%
        for (let i = 0; i < Math.min(expectedSums.length, actualSums.length); i++) {
          const expected = expectedSums[i];
          const actual = actualSums[i];
          const tolerance = Math.max(expected * 0.1, 1); // 10% или минимум 1
          
          expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
        }
      }
    }

    // Проверяем, что все даты корректные
    const dates = ['2024-09-30', '2023-12-31', '2022-12-31'];
    for (const item of otchetnost) {
      expect(dates).toContain(item.date);
    }

    console.log(`Найдено ${otchetnost.length} элементов`);
    console.log(`Найдено ${foundCodes.size} уникальных кодов`);
  });
});
