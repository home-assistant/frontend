import type { LocalizeFunc } from "../../../common/translations/localize";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { generateDefaultSection } from "./default-section";

export const generateDefaultView = (
  localize: LocalizeFunc,
  includeHeading?: boolean
) =>
  ({
    type: "sections",
    sections: [generateDefaultSection(localize, includeHeading)],
  }) as LovelaceViewConfig;
