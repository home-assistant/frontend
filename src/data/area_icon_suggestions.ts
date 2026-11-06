export const ROOM_ICONS = {
  living_room: [
    "mdi:sofa",
    "mdi:sofa-single",
    "mdi:television",
    "mdi:fireplace",
    "mdi:floor-lamp",
  ],
  bedroom: ["mdi:bed", "mdi:bed-king", "mdi:bed-double", "mdi:lamp"],
  kids_room: ["mdi:teddy-bear", "mdi:toy-brick", "mdi:bunk-bed", "mdi:cradle"],
  kitchen: [
    "mdi:stove",
    "mdi:fridge",
    "mdi:countertop",
    "mdi:chef-hat",
    "mdi:pot-steam",
    "mdi:coffee-maker",
  ],
  dining_room: [
    "mdi:silverware-fork-knife",
    "mdi:table-chair",
    "mdi:table-furniture",
    "mdi:glass-wine",
  ],
  bathroom: [
    "mdi:shower",
    "mdi:bathtub",
    "mdi:shower-head",
    "mdi:toothbrush",
    "mdi:hair-dryer",
  ],
  toilet: ["mdi:toilet", "mdi:paper-roll"],
  office: [
    "mdi:desk",
    "mdi:laptop",
    "mdi:monitor",
    "mdi:chair-rolling",
    "mdi:bookshelf",
  ],
  laundry_room: [
    "mdi:washing-machine",
    "mdi:tumble-dryer",
    "mdi:iron",
    "mdi:hanger",
  ],
  hallway: ["mdi:door", "mdi:door-open", "mdi:coat-rack", "mdi:key"],
  stairs: ["mdi:stairs", "mdi:stairs-up", "mdi:stairs-down"],
  garage: ["mdi:garage", "mdi:garage-variant", "mdi:car", "mdi:tools"],
  garden: [
    "mdi:flower",
    "mdi:tree",
    "mdi:grass",
    "mdi:sprout",
    "mdi:watering-can",
    "mdi:greenhouse",
  ],
  terrace: [
    "mdi:balcony",
    "mdi:grill",
    "mdi:umbrella-outline",
    "mdi:coach-lamp",
    "mdi:patio-heater",
  ],
  basement: [
    "mdi:home-floor-negative-1",
    "mdi:stairs-down",
    "mdi:water-boiler",
  ],
  attic: ["mdi:home-roof", "mdi:package-variant-closed"],
  storage: ["mdi:archive", "mdi:package-variant-closed", "mdi:warehouse"],
  utility_room: [
    "mdi:water-boiler",
    "mdi:heat-pump",
    "mdi:server-network",
    "mdi:flash",
  ],
  gym: ["mdi:dumbbell", "mdi:weight-lifter", "mdi:yoga", "mdi:run"],
  pool: ["mdi:pool", "mdi:swim"],
  home_cinema: ["mdi:theater", "mdi:projector", "mdi:television"],
} as const satisfies Record<string, readonly string[]>;

export type RoomType = keyof typeof ROOM_ICONS;

type RoomKeywords = Partial<Record<RoomType, string[]>>;

export const ROOM_TYPES = Object.keys(ROOM_ICONS) as RoomType[];

export const isRoomType = (value: string): value is RoomType =>
  (ROOM_TYPES as string[]).includes(value);

// Languages written without spaces between words
const NO_WORD_SPACING =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

const normalizeRoomText = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

interface RoomMatch {
  room: RoomType;
  start: number;
  end: number;
}

const findMatches = (name: string, keywords: RoomKeywords): RoomMatch[] => {
  const text = ` ${normalizeRoomText(name)} `;
  const candidates: RoomMatch[] = [];
  for (const room of ROOM_TYPES) {
    for (const keyword of keywords[room] ?? []) {
      const phrase = normalizeRoomText(keyword);
      if (!phrase) {
        continue;
      }
      const needle = NO_WORD_SPACING.test(phrase) ? phrase : ` ${phrase} `;
      const start = text.indexOf(needle);
      if (start !== -1) {
        candidates.push({ room, start, end: start + needle.length });
      }
    }
  }
  // The longest phrase wins, so "guest bedroom" is not also read as "bedroom"
  candidates.sort((a, b) => b.end - b.start - (a.end - a.start));
  const kept: RoomMatch[] = [];
  for (const match of candidates) {
    const overlaps = kept.some(
      (other) => match.start < other.end - 1 && other.start < match.end - 1
    );
    if (!overlaps) {
      kept.push(match);
    }
  }
  return kept.sort((a, b) => a.start - b.start);
};

const matchRoomTypes = (
  names: string[],
  keywords: RoomKeywords
): RoomType[] => {
  const rooms = new Set<RoomType>();
  for (const name of names) {
    for (const match of findMatches(name, keywords)) {
      rooms.add(match.room);
    }
  }
  return [...rooms];
};

const roomIconSuggestions = (rooms: RoomType[]): string[] => [
  ...new Set(rooms.flatMap((room) => ROOM_ICONS[room])),
];

const KEYWORDS: Record<string, Promise<RoomKeywords | undefined>> = {};

const loadRoomKeywords = (language: string) => {
  KEYWORDS[language] ??= import(`./area_icon_keywords/${language}.json`)
    .then((module) => module.default as RoomKeywords)
    .catch(() => undefined);
  return KEYWORDS[language];
};

export const getAreaIconSuggestions = async (
  names: string[],
  language: string
): Promise<string[]> => {
  const keywords =
    (await loadRoomKeywords(language)) ??
    (await loadRoomKeywords(language.split("-")[0]));
  if (!keywords) {
    return [];
  }
  return roomIconSuggestions(matchRoomTypes(names, keywords));
};
