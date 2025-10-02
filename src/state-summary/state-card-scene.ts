import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/state-info";
import "../components/ha-button";
import { activateScene } from "../data/scene";
import type { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-scene")
class StateCardScene extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render() {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <ha-button appearance="plain" size="small" @click=${this._activateScene}
          >${this.hass.localize("ui.card.scene.activate")}</ha-button
        >
      </div>
    `;
  }

  private _activateScene(ev) {
    ev.stopPropagation();
    activateScene(this.hass, this.stateObj.entity_id);
  }

  static get styles(): CSSResultGroup {
    return [haStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-scene": StateCardScene;
  }
}
