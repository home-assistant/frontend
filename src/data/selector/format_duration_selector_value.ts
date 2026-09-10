import { durationDataToSeconds } from "../../common/datetime/duration_to_seconds";
import { durationValueToData } from "../../common/datetime/duration_value_to_data";
import { normalizeDuration } from "../../common/datetime/normalize_duration";
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
  if (!data) {
    return "";
  }
  const { negative, ...components } = normalizeDuration(data);
  const total = durationDataToSeconds(components);
  if (!Number.isFinite(total)) {
    return "";
  }
  const mode = getDurationSelectorMode(config);
  if (mode === "offset" && total === 0) {
    return "";
  }
  const duration = formatDuration(locale, components);
  if (!duration || mode === "positive") {
    return duration;
  }
  const sign = negative ? "negative" : "positive";
  return localize(`ui.components.selectors.duration.summary.${mode}_${sign}`, {
    duration,
  });
};
