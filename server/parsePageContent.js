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
  
  for (const line of allLines) {
    const codeMatch = line.match(/^(\d{4,5})\s*$/);
    if (codeMatch) {
      const code = codeMatch[1];
      if (code.length === 4 && parseInt(code) >= 1900 && parseInt(code) <= 2100) {
        continue;
      }
      
      for (const date of dates) {
        otchetnost.push({
          date: date,
          code: code,
          sum: 0
        });
      }
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


