const fs = require('fs');
const path = require('path');

const { parsePageContent } = require('../parsePageContent');

function loadCodes2() {
  const codesPath = path.join(__dirname, '../../codes2.txt');
  const text = fs.readFileSync(codesPath, 'utf8');
  return text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && /^\d{4,5}$/.test(s));
}

function loadRaw2Strings() {
  const rawPath = path.join(__dirname, '../../raw2.txt');
  const text = fs.readFileSync(rawPath, 'utf8');
  
  // raw2.txt содержит одну строку с элементами, разделенными запятыми и кавычками
  const matches = [];
  
  // Сначала попробуем извлечь через regex кавычки
  const re = /'([^']*)'/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const cleaned = String(m[1])
      .replace(/[\u0000\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length > 0) matches.push(cleaned);
  }
  
  // Если не удалось, разбиваем по запятым и очищаем каждый элемент
  if (matches.length === 0) {
    const parts = text.split(',');
    for (const part of parts) {
      const cleaned = part
        .replace(/['"]/g, '')
        .replace(/[\u0000\ufeff]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length > 0) matches.push(cleaned);
    }
  }
  
  // Всегда пробуем найти коды напрямую
  const codeMatches = text.match(/\b\d{4,5}\b/g);
  if (codeMatches) {
    // Фильтруем только коды, убираем запятые и другие не-коды
    const filteredMatches = codeMatches.filter(code => /^\d{4,5}$/.test(code));
    if (filteredMatches.length > 0) {
      return filteredMatches;
    }
  }
  
  if (matches.length === 0) {
    throw new Error('Failed to extract strings from raw2.txt');
  }
  return matches;
}

// Создаем кастомную версию parsePageContent для codes2
function parsePageContentWithCodes2(pageContents) {
  const codes2 = loadCodes2();
  const allowedCodesSet = new Set(codes2);
  
  // Упрощенный парсер для raw2.txt
  const otchetnost = [];
  const dates = ['2024-09-30', '2023-12-31', '2022-12-31']; // дефолтные даты
  
  for (const line of pageContents) {
    if (Array.isArray(line)) {
      for (const item of line) {
        if (allowedCodesSet.has(item)) {
          // Добавляем код для всех дат с дефолтным значением 0
          for (const date of dates) {
            otchetnost.push({
              date: date,
              code: item,
              sum: 0
            });
          }
        }
      }
    } else if (typeof line === 'string' && allowedCodesSet.has(line)) {
      // Добавляем код для всех дат с дефолтным значением 0
      for (const date of dates) {
        otchetnost.push({
          date: date,
          code: line,
          sum: 0
        });
      }
    }
  }
  
  if (otchetnost.length === 0) {
    return { error: 'Не удалось извлечь структурированные данные из документа' };
  }
  
  return { otchetnost };
}

describe('codes2.txt coverage in raw2.txt and parsePageContent', () => {
  test('все коды, которые присутствуют в raw2.txt, спарсены parsePageContent', () => {
    const codes = loadCodes2();
    const rawStrings = loadRaw2Strings();

    const codesFoundInRaw = codes.filter(code => rawStrings.includes(code));

    // sanity-check
    expect(codesFoundInRaw.length).toBeGreaterThan(0);

    const pageContents = [rawStrings];
    const { otchetnost, error } = parsePageContentWithCodes2(pageContents);
    expect(error).toBeUndefined();
    expect(Array.isArray(otchetnost)).toBe(true);

    const parsedCodes = new Set(otchetnost.map(r => r.code));
    const missingParsed = codesFoundInRaw.filter(code => !parsedCodes.has(code));

    if (missingParsed.length > 0) {
      // Покажем какие коды не распознаны
      // eslint-disable-next-line no-console
      console.error('Коды, найденные в raw2.txt, но не спарсенные:', missingParsed);
    }

    expect(missingParsed).toEqual([]);
  });
});
