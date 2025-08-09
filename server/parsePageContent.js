const fs = require('fs');
const path = require('path');

let allowedCodesSet = null;
try {
  const codesPath = path.join(__dirname, '../codes.txt');
  if (fs.existsSync(codesPath)) {
    const text = fs.readFileSync(codesPath, 'utf8');
    const codes = text
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && /^\d{4,5}$/.test(s));
    allowedCodesSet = new Set(codes);
  }
} catch (_) {
  // ignore
}
const monthsMap = {
  'января': '01',
  'февраля': '02',
  'марта': '03',
  'апреля': '04',
  'мая': '05',
  'июня': '06',
  'июля': '07',
  'августа': '08',
  'сентября': '09',
  'октября': '10',
  'ноября': '11',
  'декабря': '12',
  'янв': '01',
  'фев': '02',
  'мар': '03',
  'апр': '04',
  'май': '05',
  'июн': '06',
  'июл': '07',
  'авг': '08',
  'сен': '09',
  'окт': '10',
  'ноя': '11',
  'дек': '12',
  'january': '01',
  'february': '02',
  'march': '03',
  'april': '04',
  'may': '05',
  'june': '06',
  'july': '07',
  'august': '08',
  'september': '09',
  'october': '10',
  'november': '11',
  'december': '12'
};

function parseDate(day, monthName, year) {
  const cleanMonthName = monthName.toLowerCase().replace(/[.,]/g, '').trim();
  const month = monthsMap[cleanMonthName];
  
  if (!month) {
    console.log('Не удалось распарсить месяц:', monthName, 'очищенное:', cleanMonthName);
    return null;
  }
  
  const result = `${year}-${month}-${day.padStart(2, '0')}`;
  console.log('Распарсена дата:', result, 'из:', day, monthName, year);
  return result;
}

function parsePageContent(pageContents) {
  const allLines = pageContents
    .flat()
    .map(line => String(line)
      .replace(/[\u0000\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter(line => line.length > 0);

  // DEBUG выводы закомментированы для продакшена
  // console.log('=== DEBUG: parsePageContent ===');
  // console.log('Всего строк:', allLines.length);
  // console.log('Первые 20 строк:', allLines.slice(0, 20));
  let formType = null;
  let columns = 0;
  const formIndex = allLines.findIndex(line => line === 'Форма по ОКУД');
  if (formIndex !== -1) {
    formType = allLines[formIndex + 1];
    // console.log('Найдена форма:', formType);
  } else {
    // console.log('Форма по ОКУД не найдена, ищем альтернативы...');
    const balanceIndex = allLines.findIndex(line => line.includes('БАЛАНС') || line.includes('баланс'));
    const ofrIndex = allLines.findIndex(line => line.includes('ОТЧЕТ') || line.includes('отчет'));
    
    if (balanceIndex !== -1) {
      formType = '0710001';
      // console.log('Найден баланс, предполагаем форму 0710001');
    } else if (ofrIndex !== -1) {
      formType = '0710002';
      // console.log('Найден отчет, предполагаем форму 0710002');
    } else {
      // Дополнительная эвристика: по токенам формы
      if (allLines.some(l => /0710001/.test(l))) {
        formType = '0710001';
        // console.log('Найден токен 0710001, устанавливаем форму 0710001');
      } else if (allLines.some(l => /0710002/.test(l))) {
        formType = '0710002';
        // console.log('Найден токен 0710002, устанавливаем форму 0710002');
      }
    }
  }
  
  if (formType === '0710001') {
    columns = 3;
  } else if (formType === '0710002') {
    columns = 2;
  } else {
    // console.log('Не удалось определить форму, используем эвристику');
    const dateHeaders = allLines.filter(line => line.startsWith('На ') || line.match(/\d{1,2}\s+\w+/));
    columns = Math.min(dateHeaders.length, 3);
    // console.log('Предполагаем колонок:', columns);
    if (columns === 0) {
      columns = 3; // безопасное значение по умолчанию
    }
  }

  const dates = [];
  
  const datePatterns = [
    /На (\d{1,2}) (\w+)/,
    /(\d{1,2}) (\w+)/,
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/
  ];
  
  const yearLines = allLines.filter(line => /^((19|20)\d{2})\D*$/.test(line));
  // console.log('Найдены годы:', yearLines);
  const foundDates = [];
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        let day, month, year;
        
        if (pattern.source.includes('\\d{4}')) {
          day = match[1];
          month = match[2];
          year = match[3];
        } else {
          day = match[1];
          month = match[2];
          
          for (let j = i + 1; j < Math.min(i + 6, allLines.length); j++) {
            const yearMatch = allLines[j].match(/^((19|20)\d{2})\D*$/);
            if (yearMatch) {
              year = yearMatch[1];
              break;
            }
          }
          
          if (!year) {
            year = '2024';
          }
        }
        
        const parsed = parseDate(day, month, year);
        if (parsed) {
          foundDates.push({
            date: parsed,
            line: line,
            index: i
          });
        }
        break;
      }
    }
  }
  
  // console.log('Найденные даты:', foundDates);
  
  const uniqueDates = [];
  for (const foundDate of foundDates) {
    if (!uniqueDates.some(d => d.date === foundDate.date)) {
      uniqueDates.push(foundDate);
      if (uniqueDates.length >= columns) break;
    }
  }
  
  for (const uniqueDate of uniqueDates) {
    dates.push(uniqueDate.date);
    // console.log('Добавлена дата:', uniqueDate.date, 'из строки:', uniqueDate.line);
  }
  
  if (dates.length === 0) {
    // Построим даты по найденным годам
    const years = [];
    for (const l of allLines) {
      const m = l.match(/^(\d{4})\D*$/);
      if (m) {
        const y = m[1];
        if (!years.includes(y)) years.push(y);
      }
      if (years.length >= columns) break;
    }
    if (years.length > 0) {
      for (let i = 0; i < Math.min(years.length, columns); i++) {
        const y = years[i];
        const md = i === 0 ? '09-30' : '12-31';
        dates.push(`${y}-${md}`);
      }
    }
  }

  while (dates.length < columns) {
    const base = dates.length > 0 ? new Date(dates[dates.length - 1]) : new Date();
    const newDate = new Date(base.getFullYear(), base.getMonth() - 3, base.getDate());
    const newDateStr = newDate.toISOString().split('T')[0];
    dates.push(newDateStr);
    // console.log('Добавлена дополнительная дата:', newDateStr);
  }
  
  // console.log('Итоговые даты:', dates);
  // console.log('Количество колонок:', columns);

  let tableStart = allLines.findIndex(line => 
    line === 'Пояснения' || 
    line === 'АКТИВ' || 
    line === 'ПАССИВ' ||
    line.includes('Код') ||
    line.includes('код')
  );
  if (tableStart === -1) {
    // Попробуем найти первое место, где идут несколько кодов подряд
    for (let i = 0; i < allLines.length; i++) {
      if (/^\d{4,5}$/.test(allLines[i])) {
        let seq = 1;
        for (let k = i + 1; k < Math.min(i + 10, allLines.length); k++) {
          if (/^\d{4,5}$/.test(allLines[k])) seq++;
        }
        if (seq >= 2) {
          tableStart = i;
          break;
        }
      }
    }
    if (tableStart === -1) {
      tableStart = allLines.findIndex(line => /^\d{4,5}$/.test(line));
      if (tableStart === -1) tableStart = 0;
    }
  }
  
  // console.log('Начало таблицы:', tableStart);

  const otchetnost = [];
  let processedCodes = 0;
  
  let currentCode = null;
  let currentSums = [];
  
  const codeData = new Map();
  
  const hasDescriptiveTextBefore = (list, idx) => {
    for (let j = Math.max(0, idx - 10); j < idx; j++) {
      const prevLine = list[j];
      if (prevLine && prevLine.trim()) {
        // Разрешаем любые буквы (латиница/кириллица) и не-ASCII (в т.ч. '�')
        const hasLetters = /[A-Za-zА-Яа-яЁё]/.test(prevLine) || /[^\x00-\x7F]/.test(prevLine);
        const isPureNumber = /^\d+$/.test(prevLine);
        const isMeta = prevLine.includes('Код') || prevLine.includes('код') || prevLine.includes('АКТИВ') || prevLine.includes('ПАССИВ') || prevLine.startsWith('На ');
        const isYear = /^(\d{4})\D*$/.test(prevLine);
        if (hasLetters && !isPureNumber && !isMeta && !isYear) {
          return true;
        }
      }
    }
    return false;
  };

  for (let i = tableStart; i < allLines.length && processedCodes < 100; i++) {
    const line = allLines[i];
    
    if (/^\d{4,5}$/.test(line)) {
      const num = parseInt(line, 10);
      // Исключаем годы вида 19xx-20xx, чтобы не спутать с кодами
      const isYearNumber = line.length === 4 && num >= 1900 && num <= 2100;
      if (!isYearNumber && num >= 1000 && num <= 99999) {
        if (hasDescriptiveTextBefore(allLines, i)) {
          if (currentCode) {
            codeData.set(currentCode, [...currentSums]);
            // console.log('Сохранены данные для кода:', currentCode, 'суммы:', currentSums);
          }
          currentCode = line;
          currentSums = [];
          // console.log('Найден код:', currentCode);
        }
      }
    } else if (currentCode && (/\d/.test(line) || line === '-' || line === '.')) {
      const numberMatches = line.match(/\d[\d\s]*/g);
      if (numberMatches) {
        for (const match of numberMatches) {
          const cleanNumber = match.replace(/\s/g, '').replace(/[^\d]/g, '');
          if (cleanNumber && cleanNumber.length > 0) {
            const sum = parseInt(cleanNumber, 10);
            if (!isNaN(sum) && sum > 0) {
              currentSums.push(sum);
            }
          }
        }
      }
    }
  }
  
  if (currentCode) {
    codeData.set(currentCode, [...currentSums]);
    // console.log('Сохранены данные для последнего кода:', currentCode, 'суммы:', currentSums);
  }
  
  for (const [code, sums] of codeData) {
    if (allowedCodesSet && !allowedCodesSet.has(code)) {
      continue;
    }
    for (let j = 0; j < columns; j++) {
      const sum = sums[j] || 0;
      otchetnost.push({
        date: dates[j],
        code: code,
        sum: sum
      });
    }
    processedCodes++;
  }
  
  // console.log('Обработано кодов:', processedCodes);
  // console.log('Создано записей:', otchetnost.length);
  // console.log('=== КОНЕЦ parsePageContent ===');
  
  if (otchetnost.length === 0) {
    // console.log('Не удалось извлечь структурированные данные');
    return { 
      error: 'Не удалось извлечь структурированные данные из документа',
      otchetnost: [],
      rawLines: allLines.slice(0, 50)
    };
  }
  
  return { otchetnost };
}

module.exports = { parsePageContent };


