import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wordsPath = join(__dirname, '..', 'data', 'words.txt');
const namesPath = join(__dirname, '..', 'data', 'names.txt');
const nameWordsPath = join(__dirname, '..', 'data', 'name-words.txt');
const popularWordsPath = join(__dirname, '..', 'data', 'google-10000-english-usa-no-swears.txt');
const wordsOutputPath = join(__dirname, '..', 'src', 'words.json');

function readWordLines(path: string): string[] {
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
}

const nameWords = new Set(readWordLines(nameWordsPath));

const names = new Set(
  readWordLines(namesPath).filter((w) => !nameWords.has(w)),
);

function filterFiveLetterWords(lines: string[], skipHeader = false): string[] {
  const five: string[] = [];
  const source = skipHeader ? lines.slice(1) : lines;
  for (const w of source) {
    if (w.length !== 5 || !/^[a-z]+$/.test(w)) continue;
    if (names.has(w)) {
      console.log(`Filtered out name: ${w}`);
      continue;
    }
    five.push(w);
  }
  five.sort();
  return five;
}

const fiveRaw = filterFiveLetterWords(readWordLines(wordsPath), true);
const fiveSet = new Set(fiveRaw);
const popularRaw = filterFiveLetterWords(readWordLines(popularWordsPath));
const popularOnly = popularRaw.filter((w) => !fiveSet.has(w));
const five = [...fiveRaw, ...popularOnly].sort();
const popularWords = popularRaw;

const words = { five, popularWords };

console.log(`${five.length} five-letter words`);
console.log(`${popularWords.length} popular five-letter words`);
writeFileSync(wordsOutputPath, JSON.stringify(words, null, 2));
console.log(`Written to ${wordsOutputPath}`);
