import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

const fileContent = fs.readFileSync('complexes.csv', 'utf8');
const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true
});

const districtDongMap: Record<string, Set<string>> = {};

records.forEach((record: any) => {
  const district = record['주소(시군구)'];
  const dong = record['주소(읍면동)'];
  
  if (district && dong) {
    if (!districtDongMap[district]) {
      districtDongMap[district] = new Set();
    }
    districtDongMap[district].add(dong);
  }
});

const result: Record<string, string[]> = {};
Object.keys(districtDongMap).sort().forEach(district => {
  result[district] = Array.from(districtDongMap[district]).sort();
});

const fileOutput = `export const districtDongMap: Record<string, string[]> = ${JSON.stringify(result, null, 2)};\n`;
fs.writeFileSync('src/data/districtDongMap.ts', fileOutput);
console.log('Successfully generated src/data/districtDongMap.ts');
