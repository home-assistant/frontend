import type { TranslationDict } from "../../../src/types";

export type BackupOrRestoreKey = keyof TranslationDict["supervisor"]["backup"] &
  keyof TranslationDict["ui"]["panel"]["page-onboarding"]["restore"];
