import { LitElement, html, css } from "lit";
import { property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import type { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-state-icon";

class HaEntityMarker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "entity-id", reflect: true }) public entityId?: string;

  @property({ attribute: "entity-name" }) public entityName?: string;

  @property({ attribute: "entity-unit" }) public entityUnit?: string;

  @property({ attribute: "entity-picture" }) public entityPicture?: string;

  @property({ attribute: "entity-color" }) public entityColor?: string;

  @property({ attribute: "show-icon", type: Boolean }) public showIcon = false;

  protected render() {
    return html`
      <div
        class="marker ${this.entityPicture ? "picture" : ""}"
        style=${styleMap({ "border-color": this.entityColor })}
        @click=${this._badgeTap}
      >
        ${this.entityPicture
          ? html`<div
              class="entity-picture"
              style=${styleMap({
                "background-image": `url(${this.entityPicture})`,
              })}
            ></div>`
          : this.showIcon && this.entityId
            ? html`<ha-state-icon
                .hass=${this.hass}
                .stateObj=${this.hass?.states[this.entityId]}
              ></ha-state-icon>`
            : !this.entityUnit
              ? this.entityName
              : html`
                  ${this.entityName}
                  <span
                    class="unit"
                    style="display: ${this.entityUnit ? "initial" : "none"}"
                    >${this.entityUnit}</span
                  >
                `}
      </div>
    `;
  }

  private _badgeTap(ev: Event) {
    ev.stopPropagation();
    if (this.entityId) {
      fireEvent(this, "hass-more-info", { entityId: this.entityId });
    }
  }

  static styles = css`
    .marker {
      display: flex;
      justify-content: center;
      text-align: center;
      align-items: center;
      box-sizing: border-box;
      width: 48px;
      height: 48px;
      font-size: var(--ha-marker-font-size, var(--ha-font-size-xl));
      border-radius: var(--ha-marker-border-radius, 50%);
      border: 1px solid var(--ha-marker-color, var(--primary-color));
      color: var(--primary-text-color);
      background-color: var(--card-background-color);
    }
    .marker.picture {
      overflow: hidden;
    }
    .entity-picture {
      background-size: cover;
      height: 100%;
      width: 100%;
    }
    .unit {
      margin-left: 2px;
    }
  `;
}

customElements.define("ha-entity-marker", HaEntityMarker);

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-marker": HaEntityMarker;
  }
}
