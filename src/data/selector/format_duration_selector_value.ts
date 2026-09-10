import {
  absDurationData,
  isNegativeDuration,
  isValidDurationData,
  signedDurationToSeconds,
} from "../../common/datetime/duration_sign";
import { durationValueToData } from "../../common/datetime/duration_value_to_data";
import { formatDurationLong } from "../../common/datetime/format_duration";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { HaDurationData } from "../../components/ha-duration-input";
import type { DurationSelector } from "../selector";
import { getDurationSelectorMode } from "../selector";
import type { FrontendLocaleData } from "../translation";

export const formatDurationSelectorValue = (
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  value: HaDurationData | string | number | undefined,
  config: DurationSelector["duration"],
  formatDuration: (
    locale: FrontendLocaleData,
    duration: HaDurationData
  ) => string = formatDurationLong
): string => {
  const data = durationValueToData(value);
  if (!data || !isValidDurationData(data)) {
    return "";
  }
  const mode = getDurationSelectorMode(config);
  if (mode === "offset" && signedDurationToSeconds(data) === 0) {
    return "";
  }
  const duration = formatDuration(locale, absDurationData(data));
  if (!duration || mode === "positive") {
    return duration;
  }
  const sign = isNegativeDuration(data) ? "negative" : "positive";
  return localize(`ui.components.selectors.duration.summary.${mode}_${sign}`, {
    duration,
  });
};
