import type { HassConfig } from "home-assistant-js-websocket";
import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../cards/hui-error-card";

export const createEntityNotFoundWarning = (
  localize: LocalizeFunc,
  config: HassConfig
) =>
  config.state !== STATE_NOT_RUNNING
    ? localize("ui.card.common.entity_not_found")
    : localize("ui.panel.lovelace.warning.starting");

@customElement("hui-warning")
export class HuiWarning extends LitElement {
  protected render(): TemplateResult {
    return html`<hui-error-card severity="warning"
      ><slot></slot
    ></hui-error-card>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-warning": HuiWarning;
  }
}
