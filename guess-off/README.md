# Guess Off

Word list from https://norvig.com/ngrams/

## Setup

```bash
npm install
npm run words   # generate src/words.json from data/enable2k.txt
npm run dev
```

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run words` — regenerate `src/words.json` from the enable2k dictionary (5-letter words only, names excluded)
