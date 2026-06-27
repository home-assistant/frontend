import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./ha-icon";
import "./ha-svg-icon";
import { consumeEntityState } from "../common/decorators/consume-context-entry";
import { computeDomain } from "../common/entity/compute_domain";
import "./ha-domain-icon";
import "./ha-state-icon";

@customElement("ha-entity-id-icon")
export class HaEntityIdIcon extends LitElement {
  @state()
  @consumeEntityState({ entityIdPath: ["entityId"] })
  private stateObj?: HassEntity;

  @property({ attribute: false }) public entityId!: string;

  @property({ attribute: "state-title", type: Boolean }) public stateTitle =
    false;

  protected render() {
    if (this.stateObj) {
      return html`<ha-state-icon
        .stateObj=${this.stateObj}
        .stateTitle=${this.stateTitle}
      ></ha-state-icon>`;
    }
    return html`<ha-domain-icon
      .domain=${computeDomain(this.entityId)}
    ></ha-domain-icon>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-id-icon": HaEntityIdIcon;
  }
}
