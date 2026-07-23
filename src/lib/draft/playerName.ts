const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/**
 * Best-effort last name for sorting: the last word of the full name, unless
 * it's a generational suffix (Jr./Sr./II/…), in which case the word before
 * it is used. For DST rows, `fullName` is the team name, so this naturally
 * sorts by team nickname (e.g. "Baltimore Ravens" -> "Ravens").
 */
export function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fullName;

  let index = parts.length - 1;
  while (
    index > 0 &&
    NAME_SUFFIXES.has(parts[index].toLowerCase().replace(/\.$/, ""))
  ) {
    index--;
  }
  return parts[index];
}
