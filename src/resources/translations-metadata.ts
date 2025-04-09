import type { TranslationMetadata } from "../types.js";

import * as translationMetadata_ from "../../build/translations/translationMetadata.json";

export const translationMetadata = (translationMetadata_ as any)
  .default as TranslationMetadata;
