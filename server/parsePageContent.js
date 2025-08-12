function parsePageContent(pageContents) {
  if (!pageContents || !Array.isArray(pageContents)) {
    return { error: 'Invalid input data', otchetnost: [] };
  }

  const tokens = pageContents
    .flat()
    .map(x => String(x)
      .replace(/[\u0000\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { error: 'No valid lines found', otchetnost: [] };
  }

  const joinedLower = tokens.join(' ').toLowerCase();
  const hasBalance = joinedLower.includes('0710001');
  const hasPnl = joinedLower.includes('0710002');

  const reportDate = detectReportDate(tokens) || '2024-12-31';

  const { y, m, d } = splitDate(reportDate);
  const bDates = [
    reportDate,
    `${y - 1}-12-31`,
    `${y - 2}-12-31`
  ];
  const pDates = [
    reportDate,
    `${y - 1}-${pad2(m)}-${pad2(d)}`
  ];

  const balanceCodes = new Set([
    '1110','1120','1130','1140','1150','11501','11502','1160','1170','11701','1180','1190',
    '1100','1210','12101','12102','12103','1220','12201','12202','1230','12301','12302',
    '12303','12304','12305','12306','1240','12401','1250','12501','12502','1260','12601',
    '1200','1600','1310','1320','1340','1350','1360','1370','1300','1410','1420','1430',
    '1440','1450','1400','1510','15101','1520','15201','15202','15203','15204','15205',
    '15206','15207','1530','1540','1550','1500','1700'
  ]);

  const pnlCodes = new Set([
    '2110','2120','2100','2210','2220','2200','2310','2320','2330','2340','23401','23402',
    '23403','23404','23405','23406','2350','23501','23502','23503','23504','23505','23506',
    '23507','23508','23509','2300','2410','2411','2412','2460','2400','2510','2520','2530',
    '2500','2900','2910'
  ]);

  const foundCodes = new Set();
  for (const token of tokens) {
    if (balanceCodes.has(token) || pnlCodes.has(token)) {
      foundCodes.add(token);
    }
  }

  const allowedCodes = Array.from(foundCodes);
  const allowedSet = new Set(allowedCodes);

  const codeToSums = new Map();
  const MAX_LOOKAHEAD = 25;

  function groupOf(code) {
    if (pnlCodes.has(code) && !balanceCodes.has(code)) return 'pnl';
    if (balanceCodes.has(code) && !pnlCodes.has(code)) return 'balance';
    if (pnlCodes.has(code) && balanceCodes.has(code)) {
      if (hasPnl && !hasBalance) return 'pnl';
      if (hasBalance && !hasPnl) return 'balance';
      return balanceCodes.has(code) ? 'balance' : 'pnl';
    }
    return hasBalance ? 'balance' : (hasPnl ? 'pnl' : 'balance');
  }

  function numbersNeededFor(code) {
    return groupOf(code) === 'pnl' ? 2 : 3;
  }

  function parseNumberToken(token) {
    if (!token) return null;
    let s = String(token)
      .replace(/\u00A0/g, ' ')
      .replace(/−/g, '-')
      .trim();

    if (s === '-' || s === '—' || s === '–') return 0;

    let negative = false;
    if (s.startsWith('(') && s.endsWith(')')) {
      negative = true;
      s = s.slice(1, -1).trim();
    }

    if (!/^\d[\d\s]*$/.test(s)) return null;

    const n = parseInt(s.replace(/\s+/g, ''), 10);
    if (isNaN(n)) return null;
    return negative ? -n : n;
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (!allowedSet.has(tok)) continue;

    const code = tok;
    const needed = numbersNeededFor(code);
    const sums = [];
    const myGroup = groupOf(code);

    let j = i + 1;
    while (j < tokens.length && sums.length < needed && (j - i) <= MAX_LOOKAHEAD) {
      const next = tokens[j];

      if (allowedSet.has(next)) {
        const nextGroup = groupOf(next);
        if (nextGroup === myGroup) break;
      }

      const val = parseNumberToken(next);
      if (val !== null) {
        sums.push(val);
      }

      j++;
    }

    while (sums.length < needed) sums.push(0);
    codeToSums.set(code, sums);
  }

  const otchetnost = [];
  for (const code of allowedCodes) {
    const group = groupOf(code);
    const dates = group === 'pnl' ? pDates : bDates;
    const needed = dates.length;
    const sums = codeToSums.get(code) || Array(needed).fill(0);

    for (let k = 0; k < needed; k++) {
      otchetnost.push({
        date: dates[k],
        code,
        sum: sums[k] ?? 0
      });
    }
  }

  return { otchetnost };

  function detectReportDate(allTokens) {
    const idx = allTokens.findIndex(t => /дата/i.test(t));
    let triple = null;

    if (idx !== -1) {
      triple = findDateTripleNear(allTokens, idx, 12);
    }
    if (!triple) {
      triple = findDateTripleNear(allTokens, 0, allTokens.length);
    }

    if (!triple) return null;
    const [dd, mm, yyyy] = triple;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  function findDateTripleNear(arr, startIdx, lookahead) {
    const end = Math.min(arr.length, startIdx + lookahead);
    for (let i = startIdx; i + 2 < end; i++) {
      const a = arr[i], b = arr[i + 1], c = arr[i + 2];
      if (isDay(a) && isMonth(b) && isYear(c)) {
        return [toInt(a), toInt(b), toInt(c)];
      }
    }
    return null;
  }

  function isDay(s) {
    const n = toInt(s);
    return Number.isInteger(n) && n >= 1 && n <= 31;
  }
  function isMonth(s) {
    const n = toInt(s);
    return Number.isInteger(n) && n >= 1 && n <= 12;
  }
  function isYear(s) {
    const n = toInt(s);
    return Number.isInteger(n) && n >= 1900 && n <= 2100;
  }
  function toInt(s) {
    if (typeof s !== 'string') s = String(s || '');
    s = s.replace(/\s+/g, '').trim();
    if (!/^\d+$/.test(s)) return NaN;
    return parseInt(s, 10);
  }
  function splitDate(dateStr) {
    const [yy, mm, dd] = dateStr.split('-').map(Number);
    return { y: yy, m: mm, d: dd };
  }
  function pad2(n) {
    n = Number(n) || 0;
    return n < 10 ? `0${n}` : String(n);
  }
}

module.exports = { parsePageContent };