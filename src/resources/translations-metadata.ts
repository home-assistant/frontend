import * as translationMetadata_ from "../../build/translations/translationMetadata.json";
import { TranslationMetadata } from "../types.js";

export const translationMetadata = (translationMetadata_ as any)
  .default as TranslationMetadata;
