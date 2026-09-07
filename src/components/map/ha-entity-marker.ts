import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { consumeEntityState } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-state-icon";

@customElement("ha-entity-marker")
class HaEntityMarker extends LitElement {
  @property({ attribute: "entity-id", reflect: true }) public entityId?: string;

  @state()
  @consumeEntityState({ entityIdPath: ["entityId"] })
  private _stateObj?: HassEntity;

  @property({ attribute: "entity-name" }) public entityName?: string;

  @property({ attribute: "entity-unit" }) public entityUnit?: string;

  @property({ attribute: "entity-picture" }) public entityPicture?: string;

  @property({ attribute: "entity-color" }) public entityColor?: string;

  @property({ attribute: "show-icon", type: Boolean }) public showIcon = false;

  @property({ type: Boolean, reflect: true }) public selected = false;

  protected render() {
    return html`
      <div
        class="marker ${this.entityPicture ? "picture" : ""}"
        style=${styleMap({ "outline-color": this.entityColor })}
        @click=${this._badgeTap}
      >
        ${
          this.entityPicture
            ? html`<div
                class="entity-picture"
                style=${styleMap({
                  "background-image": `url(${this.entityPicture})`,
                })}
              ></div>`
            : this.showIcon && this.entityId
              ? html`<ha-state-icon
                  .stateObj=${this._stateObj}
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
                  `
        }
      </div>
    `;
  }

  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this._handleKeydown);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._handleKeydown);
  }

  // The map engines make the marker a focusable button
  private _handleKeydown = (ev: KeyboardEvent) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._badgeTap(ev);
    }
  };

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
      width: var(--ha-marker-size, 48px);
      height: var(--ha-marker-size, 48px);
      font-size: var(--ha-marker-font-size, var(--ha-font-size-xl));
      border-radius: var(--ha-marker-border-radius, 50%);
      border: var(--ha-marker-border-width, 3px) solid
        var(--ha-marker-color, var(--card-background-color, #fff));
      box-shadow: var(--ha-marker-shadow, var(--ha-box-shadow-s));
      color: var(--primary-text-color);
      background-color: var(
        --ha-marker-background,
        var(--card-background-color)
      );
    }
    .marker.picture {
      overflow: hidden;
    }
    /* A ring in the entity color outside the frame marks the selected marker */
    :host([selected]) .marker {
      outline: 3px solid var(--primary-color);
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-marker": HaEntityMarker;
  }
}
