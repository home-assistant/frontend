import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";

@customElement("ha-config-climate")
class HaConfigClimate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config/lovelace/dashboards"}
        .header=${"Climate"}
      >
        <div class="container"></div>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
    return [haStyle, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-climate": HaConfigClimate;
  }
}
