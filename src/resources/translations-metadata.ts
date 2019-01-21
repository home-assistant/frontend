import * as translationMetadata_ from "../../build-translations/translationMetadata.json";

interface TranslationMetadata {
  fragments: string[];
  translations: {
    [language: string]: {
      nativeName: string;
      fingerprints: {
        [filename: string]: string;
      };
    };
  };
}

export const translationMetadata = (translationMetadata_ as any)
  .default as TranslationMetadata;
