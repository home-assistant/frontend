import { html } from "lit";
import { HomeAssistant } from "../types";
import { documentationUrl } from "../util/documentation-url";

export const analyticsLearnMore = (hass: HomeAssistant) => html`<a
  .href=${documentationUrl(hass, "/integrations/analytics/")}
  target="_blank"
  rel="noreferrer"
>
  How we process your data
</a>`;
