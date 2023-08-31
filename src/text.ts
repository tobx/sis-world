export type MultilineText = string | string[];

export function breakLines(text: MultilineText, maxChars: number) {
  const lines = [];
  let words = [];
  for (const line of getLines(text)) {
    for (const word of getWords(line)) {
      const currentLength = words.reduce(
        (sum, word) => sum + countChars(word),
        0
      );
      if (currentLength + 1 + countChars(word) > maxChars) {
        lines.push(words.join(" "));
        words = [];
      }
      words.push(word);
    }
    if (words.length > 0) {
      lines.push(words.join(" "));
      words = [];
    }
  }
  return lines;
}

function countChars(text: MultilineText) {
  if (Array.isArray(text)) {
    text = text.join("\n");
  }
  return [...text].length;
}

export function defaultTextDuration(text: MultilineText) {
  return 1500 + 75 * countChars(text);
}

export function getLines(text: MultilineText) {
  if (Array.isArray(text)) {
    text = text.join("\n");
  }
  return text.split("\n");
}

function getWords(line: string) {
  return line.trim().split(/ +/g);
}

let locales: string | string[] | undefined;

export function setLocale(locale: string) {
  locales = locale;
}

export function uppercase(text: MultilineText) {
  if (Array.isArray(text)) {
    return text.map(line => line.toLocaleUpperCase(locales));
  }
  return text.toLocaleUpperCase(locales);
}
