import { formatNumber } from "../common/number/format_number";
import type { FrontendLocaleData } from "./translation";
import type { HomeAssistant } from "../types";

export const DOMAIN = "radio_frequency";

export interface RadioFrequencyTransmitter {
  entity_id: string;
  device_id: string | null;
  config_entry_id: string | null;
  supported_frequency_ranges: [number, number][];
  supported_modulations: string[];
}

interface RadioFrequencyTransmitterList {
  transmitters: RadioFrequencyTransmitter[];
}

export const fetchRadioFrequencyTransmitters = (
  hass: HomeAssistant
): Promise<RadioFrequencyTransmitterList> =>
  hass.callWS({
    type: "radio_frequency/list",
  });

const FREQUENCY_UNITS: [number, string][] = [
  [1e9, "GHz"],
  [1e6, "MHz"],
  [1e3, "kHz"],
  [1, "Hz"],
];

// Format a frequency in hertz using the largest unit that keeps the value >= 1.
export const formatFrequency = (
  hz: number,
  locale: FrontendLocaleData
): string => {
  const [divisor, unit] = FREQUENCY_UNITS.find(
    ([threshold]) => Math.abs(hz) >= threshold
  ) ?? [1, "Hz"];
  return `${formatNumber(hz / divisor, locale, {
    maximumFractionDigits: 3,
  })} ${unit}`;
};

// Format a single [min, max] range; collapses to a single value when min === max.
export const formatFrequencyRange = (
  range: readonly [number, number],
  locale: FrontendLocaleData
): string => {
  const [min, max] = range;
  return min === max
    ? formatFrequency(min, locale)
    : `${formatFrequency(min, locale)} – ${formatFrequency(max, locale)}`;
};

// Format a list of frequency ranges into a human-readable, comma-separated string.
export const formatFrequencyRanges = (
  ranges: readonly (readonly [number, number])[],
  locale: FrontendLocaleData
): string =>
  ranges.map((range) => formatFrequencyRange(range, locale)).join(", ");
