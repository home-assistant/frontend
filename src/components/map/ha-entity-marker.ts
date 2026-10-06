import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { consumeEntityState } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-state-icon";

export const SELECTED_MARKER_SCALE = 1.25;
// Floating: the frame hangs above a dot, a rotated-square tail between
const FLOATING_TAIL_SIZE = 12;
const FLOATING_TAIL_REACH = Math.round((FLOATING_TAIL_SIZE * Math.SQRT2) / 2);
const FLOATING_GAP = 4;
const FLOATING_DOT_SIZE = 10;
export const FLOATING_LIFT = FLOATING_GAP + FLOATING_DOT_SIZE / 2;

export const floatingMarkerFootprint = (
  markerSize: number,
  selected: boolean
): { size: [number, number]; anchor: [number, number] } => {
  const frame = selected
    ? Math.round(markerSize * SELECTED_MARKER_SCALE)
    : markerSize;
  const height = frame + FLOATING_TAIL_REACH + FLOATING_GAP + FLOATING_DOT_SIZE;
  return {
    size: [frame, height],
    anchor: [frame / 2, height - FLOATING_DOT_SIZE / 2],
  };
};

/**
 * @csspart marker - The framed avatar.
 * @csspart picture - The entity picture inside the frame.
 */
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

  @property({ type: Boolean, reflect: true }) public floating = false;

  protected render() {
    return html`
      <div
        part="marker"
        class="marker ${this.entityPicture ? "picture" : ""}"
        style=${styleMap({ "--ha-marker-selected-color": this.entityColor })}
      >
        ${
          this.entityPicture
            ? html`<div
                part="picture"
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
      ${
        this.floating
          ? html`<div class="tail"></div>
              <div class="dot"></div>`
          : nothing
      }
    `;
  }

  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener("click", this._badgeTap);
    this.addEventListener("keydown", this._handleKeydown);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this._badgeTap);
    this.removeEventListener("keydown", this._handleKeydown);
  }

  // The map engines make the marker a focusable button
  private _handleKeydown = (ev: KeyboardEvent) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._badgeTap(ev);
    }
  };

  private _badgeTap = (ev: Event) => {
    ev.stopPropagation();
    if (this.entityId) {
      fireEvent(this, "hass-more-info", { entityId: this.entityId });
    }
  };

  static styles = css`
    :host([floating]) {
      display: flex;
      flex-direction: column;
      align-items: center;
      /* One shadow for the whole pin, so the frame casts none onto the tail */
      filter: var(
        --ha-cluster-shadow,
        drop-shadow(0 1px 3px rgba(0, 0, 0, 0.12))
      );
    }
    :host([floating]) {
      pointer-events: none;
    }
    :host([floating]) .marker,
    :host([floating]) .tail {
      pointer-events: auto;
    }
    :host([floating]) .marker {
      position: relative;
      z-index: 1;
    }
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
      color: var(--primary-text-color);
      background-color: var(
        --ha-marker-background,
        var(--card-background-color)
      );
    }
    .marker.picture {
      overflow: hidden;
    }
    :host([selected]) .marker {
      width: calc(
        var(--ha-marker-size, 48px) *
          var(--ha-marker-selected-scale, ${SELECTED_MARKER_SCALE})
      );
      height: calc(
        var(--ha-marker-size, 48px) *
          var(--ha-marker-selected-scale, ${SELECTED_MARKER_SCALE})
      );
    }
    /* Floating, the accuracy circle carries the color instead of a ring */
    :host([selected]:not([floating])) .marker {
      outline: 3px solid var(--ha-marker-selected-color, var(--primary-color));
    }
    .tail {
      width: ${FLOATING_TAIL_SIZE}px;
      height: ${FLOATING_TAIL_SIZE}px;
      margin-top: ${-FLOATING_TAIL_SIZE / 2}px;
      margin-bottom: ${FLOATING_TAIL_REACH - FLOATING_TAIL_SIZE / 2}px;
      border-radius: 2px;
      background: var(--ha-marker-color, var(--card-background-color, #fff));
      transform: rotate(45deg);
    }
    .dot {
      width: ${FLOATING_DOT_SIZE}px;
      height: ${FLOATING_DOT_SIZE}px;
      margin-top: ${FLOATING_GAP}px;
      border-radius: 50%;
      background: var(--ha-marker-color, var(--card-background-color, #fff));
    }
    :host(:not([selected])) .dot {
      visibility: hidden;
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
