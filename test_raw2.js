const fs = require('fs');
const path = require('path');
const { parsePageContent } = require('./server/parsePageContent');

// Читаем raw2.txt
const raw2Path = path.join(__dirname, 'raw2.txt');
const raw2Content = fs.readFileSync(raw2Path, 'utf8');

console.log('Raw2 content length:', raw2Content.length);
console.log('Raw2 content preview:', raw2Content.substring(0, 200));

// Парсим содержимое
const pageContents = [raw2Content];
const result = parsePageContent(pageContents);

console.log('Parse result:', result);

if (result.error) {
  console.error('Error:', result.error);
} else {
  console.log('Success! Found', result.otchetnost.length, 'items');
  console.log('First 5 items:', result.otchetnost.slice(0, 5));
}
