import { html } from "lit-element";
import { HomeAssistant } from "../types";
import { documentationUrl } from "../util/documentation-url";

export const analyticsLearnMore = (hass: HomeAssistant) => html`<a
  .href=${documentationUrl(hass, "/integrations/analytics/")}
  target="_blank"
  rel="noreferrer"
  >${hass.localize("ui.panel.config.core.section.core.analytics.learn_more")}</a
>`;
