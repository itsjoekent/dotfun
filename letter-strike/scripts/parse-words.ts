import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dictionaryPath = join(__dirname, '..', 'data', 'enable2k.txt');
const mostCommonWordsPath = join(__dirname, '..', 'data', 'google-10000-english-usa-no-swears.txt');
const namesPath = join(__dirname, '..', 'data', 'names.txt');
const wordsOutputPath = join(__dirname, '..', 'src', 'words.json');
const dictionaryOutputPath = join(__dirname, '..', 'src', 'dictionary.json');

// Load names as a Set for exclusion
const namesContent = readFileSync(namesPath, 'utf-8');
const names = new Set(namesContent.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));

// Load google-10000 words as a Set for fast lookup
const mostCommonWordsContent = readFileSync(mostCommonWordsPath, 'utf-8');
const mostCommonWords = new Set(mostCommonWordsContent.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));

// Load enable2k dictionary
const dictionaryContent = readFileSync(dictionaryPath, 'utf-8');
const allDictionaryWords = dictionaryContent
  .split('\n')
  .map(w => w.trim().toLowerCase())
  .filter(w => w && !names.has(w));

// Filter to only words that exist in google-10000 (for game word generation)
const mostCommonDictionaryWords = allDictionaryWords.filter(w => mostCommonWords.has(w));

// words.json: Common words for game generation (smaller set)
const words = {
  four: mostCommonDictionaryWords.filter(w => w.length === 4),
  five: mostCommonDictionaryWords.filter(w => w.length === 5),
};

// dictionary.json: Full dictionary for validation (larger set)
const dictionary = {
  four: allDictionaryWords.filter(w => w.length === 4),
  five: allDictionaryWords.filter(w => w.length === 5),
};

console.log('words.json (common words for game generation):');
console.log(`  ${words.four.length} 4-letter words`);
console.log(`  ${words.five.length} 5-letter words`);

console.log('\ndictionary.json (full dictionary for validation):');
console.log(`  ${dictionary.four.length} 4-letter words`);
console.log(`  ${dictionary.five.length} 5-letter words`);

writeFileSync(wordsOutputPath, JSON.stringify(words, null, 2));
console.log(`\nWritten words to ${wordsOutputPath}`);

writeFileSync(dictionaryOutputPath, JSON.stringify(dictionary, null, 2));
console.log(`Written dictionary to ${dictionaryOutputPath}`);

