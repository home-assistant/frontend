import { html } from "lit";
import "../../../../../components/ha-gauge";
import type { FrontendLocaleData } from "../../../../../data/translation";

/**
 * Holds the place of an energy gauge card's gauge and name while its data
 * loads. The gauge is hidden, as it has no value yet, but a skeleton drawn
 * over the card still takes its shape.
 */
export const renderEnergyGaugeLoading = (
  locale: FrontendLocaleData,
  loadingText: string
) => html`
  <ha-gauge
    style="opacity: 0"
    aria-hidden="true"
    .value=${0}
    label="%"
    .locale=${locale}
  ></ha-gauge>
  <div class="name">${loadingText}</div>
`;
