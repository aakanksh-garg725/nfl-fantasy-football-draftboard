export interface NflTeamMeta {
  abbr: string;
  city: string;
  nickname: string;
}

/**
 * The 32 NFL franchises. Stable reference data (not season-dependent) used to
 * synthesize DST entries and to render full team names on cards/lists.
 * Abbreviations match Sleeper's `team` field convention.
 */
export const NFL_TEAMS: NflTeamMeta[] = [
  { abbr: "ARI", city: "Arizona", nickname: "Cardinals" },
  { abbr: "ATL", city: "Atlanta", nickname: "Falcons" },
  { abbr: "BAL", city: "Baltimore", nickname: "Ravens" },
  { abbr: "BUF", city: "Buffalo", nickname: "Bills" },
  { abbr: "CAR", city: "Carolina", nickname: "Panthers" },
  { abbr: "CHI", city: "Chicago", nickname: "Bears" },
  { abbr: "CIN", city: "Cincinnati", nickname: "Bengals" },
  { abbr: "CLE", city: "Cleveland", nickname: "Browns" },
  { abbr: "DAL", city: "Dallas", nickname: "Cowboys" },
  { abbr: "DEN", city: "Denver", nickname: "Broncos" },
  { abbr: "DET", city: "Detroit", nickname: "Lions" },
  { abbr: "GB", city: "Green Bay", nickname: "Packers" },
  { abbr: "HOU", city: "Houston", nickname: "Texans" },
  { abbr: "IND", city: "Indianapolis", nickname: "Colts" },
  { abbr: "JAX", city: "Jacksonville", nickname: "Jaguars" },
  { abbr: "KC", city: "Kansas City", nickname: "Chiefs" },
  { abbr: "LAC", city: "Los Angeles", nickname: "Chargers" },
  { abbr: "LAR", city: "Los Angeles", nickname: "Rams" },
  { abbr: "LV", city: "Las Vegas", nickname: "Raiders" },
  { abbr: "MIA", city: "Miami", nickname: "Dolphins" },
  { abbr: "MIN", city: "Minnesota", nickname: "Vikings" },
  { abbr: "NE", city: "New England", nickname: "Patriots" },
  { abbr: "NO", city: "New Orleans", nickname: "Saints" },
  { abbr: "NYG", city: "New York", nickname: "Giants" },
  { abbr: "NYJ", city: "New York", nickname: "Jets" },
  { abbr: "PHI", city: "Philadelphia", nickname: "Eagles" },
  { abbr: "PIT", city: "Pittsburgh", nickname: "Steelers" },
  { abbr: "SEA", city: "Seattle", nickname: "Seahawks" },
  { abbr: "SF", city: "San Francisco", nickname: "49ers" },
  { abbr: "TB", city: "Tampa Bay", nickname: "Buccaneers" },
  { abbr: "TEN", city: "Tennessee", nickname: "Titans" },
  { abbr: "WAS", city: "Washington", nickname: "Commanders" },
];

const BY_ABBR = new Map(NFL_TEAMS.map((t) => [t.abbr, t]));

export function nflTeamByAbbr(abbr: string): NflTeamMeta | undefined {
  return BY_ABBR.get(abbr);
}

export function nflTeamNickname(abbr: string): string {
  return BY_ABBR.get(abbr)?.nickname ?? abbr;
}

export function dstPlayerId(abbr: string): string {
  return `DST_${abbr}`;
}
