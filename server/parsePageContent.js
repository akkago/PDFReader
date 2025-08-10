function parsePageContent(pageContents) {
  if (!pageContents || !Array.isArray(pageContents)) {
    return { error: 'Invalid input data' };
  }

  const allLines = pageContents
    .flat()
    .map(line => String(line)
      .replace(/[\u0000\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter(line => line.length > 0);

  if (allLines.length === 0) {
    return { error: 'No valid lines found' };
  }

  const isCodesOnlyContent = allLines.length === 1 && 
    allLines[0].includes("'") && 
    allLines[0].match(/\b\d{4,5}\b/g)?.length > 5;
  
  if (isCodesOnlyContent) {
    const codeMatches = allLines[0].match(/\b\d{4,5}\b/g) || [];
    const validCodes = codeMatches.filter(code => /^\d{4,5}$/.test(code));
    
    if (validCodes.length > 0) {
      const otchetnost = [];
      const dates = ['2024-09-30', '2023-12-31', '2022-12-31'];
      
      for (const code of validCodes) {
        for (const date of dates) {
          otchetnost.push({
            date: date,
            code: code,
            sum: 0
          });
        }
      }
      
      return { otchetnost };
    }
  }

  const otchetnost = [];
  const dates = ['2024-09-30', '2023-12-31', '2022-12-31'];
  const codeData = [];
  
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    
    const codeMatches = line.match(/\b(\d{4,5})\b/g);
    if (codeMatches) {
      for (const codeMatch of codeMatches) {
        const code = codeMatch;
        if (code.length === 4 && parseInt(code) >= 1900 && parseInt(code) <= 2100) {
          continue;
        }
        
        const sums = [];
        let j = i + 1;
        
        while (j < allLines.length && j < i + 10) {
          const nextLine = allLines[j];
          const sumMatch = nextLine.match(/^(\d[\d\s]*)$/);
          
          if (sumMatch) {
            const sumStr = sumMatch[1].replace(/\s/g, '');
            const sum = parseInt(sumStr);
            if (!isNaN(sum) && sum > 0) {
              sums.push(sum);
            }
          } else if (nextLine.match(/\b\d{4,5}\b/)) {
            break;
          }
          j++;
        }
        
        if (sums.length > 0) {
          codeData.push({ code, sums });
        } else {
          codeData.push({ code, sums: [0, 0, 0] });
        }
      }
    }
  }
  
  for (const { code, sums } of codeData) {
    for (let i = 0; i < dates.length; i++) {
      otchetnost.push({
        date: dates[i],
        code: code,
        sum: sums[i] || 0
      });
    }
  }
  
  if (otchetnost.length === 0) {
    return { 
      error: 'Не удалось извлечь структурированные данные из документа',
      otchetnost: [],
      rawLines: allLines.slice(0, 50)
    };
  }
  
  return { otchetnost };
}

module.exports = { parsePageContent };


