import type { AddonStage } from "../../../../data/hassio/addon";

export const getAppDisplayName = (name: string, stage: AddonStage): string =>
  stage === "deprecated" ? name.replace(/\s*\[deprecated\]\s*$/i, "") : name;
