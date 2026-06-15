//Small formatting helpers for the card render path. Free of Lit / engine symbols
//so any card-side module can import them cheaply.

import { hexBlend } from "../../../../../../common/color/hex";
import { formatNumber } from "../../../../../../common/number/format_number";

//Format a number via HA's shared formatNumber so grouping / decimal marks match every other energy
//card. `integer = true` rounds to the nearest integer.
export function formatLocalisedNumber(
  hass: any,
  value: number,
  fractionDigits: number,
  integer = false
): string {
  //Guard NaN / Infinity from cold-cache reads so the chip shows a zero placeholder, not "NaN" / "∞".
  if (!isFinite(value)) {
    return integer ? "0" : (0).toFixed(fractionDigits);
  }
  const options: Intl.NumberFormatOptions = integer
    ? { maximumFractionDigits: 0 }
    : {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      };
  return formatNumber(value, hass?.locale, options);
}

//Uniform power readout: always kW, locale-aware, at the caller's decimals. Input is watts. `signed`
//prefixes an explicit + / − so battery charge reads apart from discharge.
export function formatPowerKw(
  hass: any,
  watts: number,
  decimals: number,
  signed = false
): string {
  if (signed) {
    const sign = watts > 0 ? "+" : watts < 0 ? "−" : "";
    return `${sign}${formatLocalisedNumber(hass, Math.abs(watts) / 1000, decimals)} kW`;
  }
  return `${formatLocalisedNumber(hass, watts / 1000, decimals)} kW`;
}

//Uniform energy readout: always kWh, locale-aware, at the caller's decimals. Input is already kWh.
export function formatEnergyKwh(
  hass: any,
  kwh: number,
  decimals: number
): string {
  return `${formatLocalisedNumber(hass, kwh, decimals)} kWh`;
}

//Normalise an energy value + unit to kWh (mirror of pvNormalizeToWatts). An unknown unit is treated
//as already kWh.
export function energyToKwh(value: number, unit: string): number {
  switch ((unit || "").trim().toLowerCase()) {
    case "wh":
      return value / 1000;
    case "mwh":
      return value * 1000;
    default:
      return value;
  }
}

//Darken a #rrggbb hex by a factor in [0, 1] (blend toward black, hue intact). Derives the sun-disc
//rim colour from the configured sun colour.
export function darkenHex(hex: string, factor: number): string {
  const keep = 1 - Math.max(0, Math.min(1, factor));
  return hexBlend(hex, "#000000", keep * 100);
}
