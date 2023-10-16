import "@material/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import "../components/entity/state-info";
import { customElement, property } from "lit/decorators";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-configurator")
class StateCardConfigurator extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  // pre load the image so the dialog is rendered the proper size
  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        ${this.inDialog
          ? html`<mwc-button>${this._localizeState(this.stateObj)}</mwc-button>`
          : nothing}
      </div>
      ${this.stateObj.attributes.description_image
        ? html`<img
            hidden=""
            alt=""
            .src=${this.stateObj.attributes.description_image}
          />`
        : nothing}
    `;
  }

  private _localizeState(stateObj) {
    return computeStateDisplay(
      this.hass.localize,
      stateObj,
      this.hass.locale,
      this.hass.config,
      this.hass.entities
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        mwc-button {
          top: 3px;
          height: 37px;
          margin-right: -0.57em;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-configurator": StateCardConfigurator;
  }
}
