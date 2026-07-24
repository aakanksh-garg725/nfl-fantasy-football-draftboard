const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/** Index of the surname word: the last one that isn't a generational suffix. */
function lastNameIndex(parts: string[]): number {
  let index = parts.length - 1;
  while (
    index > 0 &&
    NAME_SUFFIXES.has(parts[index].toLowerCase().replace(/\.$/, ""))
  ) {
    index--;
  }
  return index;
}

/**
 * Best-effort last name for sorting: the last word of the full name, unless
 * it's a generational suffix (Jr./Sr./II/…), in which case the word before
 * it is used. For DST rows, `fullName` is the team name, so this naturally
 * sorts by team nickname (e.g. "Baltimore Ravens" -> "Ravens").
 */
export function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fullName;
  return parts[lastNameIndex(parts)];
}

/**
 * Splits a name for cards that print the two halves at different sizes.
 * `last` keeps any generational suffix attached ("Marvin Harrison Jr." ->
 * "Marvin" / "Harrison Jr."), and a single-word name becomes all `last`, so
 * callers can render `first` conditionally and never lose part of the name.
 */
export function splitPlayerName(fullName: string): {
  first: string;
  last: string;
} {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first: "", last: fullName };

  const index = lastNameIndex(parts);
  return {
    first: parts.slice(0, index).join(" "),
    last: parts.slice(index).join(" "),
  };
}
