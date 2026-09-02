import type { FlattenObjectKeys } from "../../../common/translations/localize";

type TranslationDict = typeof import("../localize/languages/en.json");

export type HacsLocalizeKeys = FlattenObjectKeys<TranslationDict>;
