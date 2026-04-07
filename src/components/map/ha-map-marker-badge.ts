import { mdiAlert } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { until } from "lit/directives/until";
import { boolean, number, object, optional, string, union } from "superstruct";
import { fireEvent } from "../../common/dom/fire_event";
import { orderProperties } from "../../common/util/order-properties";
import { entityIcon } from "../../data/icons";
import type { HomeAssistant } from "../../types";
import "../entity/state-badge";
import "../ha-svg-icon";

export const MAP_CARD_BADGE_LABEL_MODES = [
  "label",
  "state",
  "attribute",
  "icon",
  "image",
] as const;
export type MapCardBadgeLabelMode = (typeof MAP_CARD_BADGE_LABEL_MODES)[number];

export interface MapMarkerBadgeConfig {
  // entity_id to be processed
  entity?: string;
  label_mode?: MapCardBadgeLabelMode;
  // only processed if `label_mode: label`; used to display a state/attribute value or any text
  label?: string;
  // chooses an attribute; only processed if `label_mode: attribute`
  attribute?: string;
  // sets a unit for an attribute value; only processed if `label_mode: attribute`
  unit?: string;
  // overrides an `entity_picture` if an `entity` is defined; or set an image if no `entity` defined
  image?: string;
  // overrides an entity icon if an `entity` is defined; or set an icon if no `entity` defined
  icon?: string;
  // affects label & icon
  color?: string;
  // as it says
  background_color?: string;
  // similar to other cards; only processed for domains which support colors
  state_color?: boolean;
  // omits a unit for compactness; applied both to a state & attribute
  hide_unit?: boolean;
}

export const mapBadgeConfigStruct = object({
  entity: optional(string()),
  label_mode: optional(string()),
  label: optional(union([string(), number()])), // allow values like "label: 123"
  attribute: optional(string()),
  unit: optional(string()),
  image: optional(string()),
  icon: optional(string()),
  color: optional(string()),
  background_color: optional(string()),
  state_color: optional(boolean()),
  hide_unit: optional(boolean()),
});

// normalize a generated yaml code by placing lines in a consistent order
export const mapMarkerBadgeOrderProperties = (
  config: MapMarkerBadgeConfig
): MapMarkerBadgeConfig => {
  const fieldOrderBadge = Object.keys(mapBadgeConfigStruct.schema);
  const orderedConfig = { ...orderProperties(config, fieldOrderBadge) };
  return orderedConfig;
};

@customElement("ha-map-marker-badge")
export class HaMapMarkerBadge extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public badge!: MapMarkerBadgeConfig;

  @property({ attribute: "border_color" }) public borderColor?: string;

  protected render() {
    const label_mode = this.badge.label_mode;
    const stateObj = this.badge.entity
      ? this.hass.states[this.badge.entity]
      : undefined;

    let icon = this.badge.icon;
    if (
      !icon &&
      stateObj &&
      stateObj.attributes.entity_picture &&
      label_mode === "icon"
    ) {
      icon = stateObj?.attributes.icon;
      if (!icon) {
        icon = until(entityIcon(this.hass, stateObj));
      }
    }

    let label;
    if (label_mode === "label") {
      label = this.badge.label;
    } else if (label_mode === "state" && stateObj) {
      if (this.badge.hide_unit) {
        const stateParts = this.hass.formatEntityStateToParts(stateObj);
        label = stateParts
          .filter((part) => part.type === "value")
          .map((part) => part.value)
          .join("");
      } else {
        label = this.hass.formatEntityState(stateObj);
      }
    } else if (label_mode === "attribute" && this.badge.attribute && stateObj) {
      if (this.badge.hide_unit) {
        const attrParts = this.hass.formatEntityAttributeValueToParts(
          stateObj,
          this.badge.attribute
        );
        label = attrParts
          .filter((part) => part.type === "value")
          .map((part) => part.value)
          .join("");
      } else {
        label = this.hass.formatEntityAttributeValue(
          stateObj,
          this.badge.attribute
        );
        if (this.badge.unit) {
          const composed = `${label} ${this.badge.unit}`;
          label = composed;
        }
      }
    }

    const clsImageOnly =
      label_mode === "image" && this.badge.image && !stateObj;
    const clsLabel =
      ((label_mode === "state" ||
        (label_mode === "attribute" && this.badge.attribute)) &&
        stateObj) ||
      (label_mode === "label" && this.badge.label);

    const error =
      (!label_mode && !stateObj) ||
      (label_mode === "label" && !this.badge.label) ||
      (label_mode === "state" && !stateObj) ||
      (label_mode === "attribute" && !stateObj) ||
      (label_mode === "attribute" && !this.badge.attribute);

    return html`
      <div
        class=${classMap({
          badge: true,
          "image-only": clsImageOnly,
          label: clsLabel,
          colored:
            this.badge.color &&
            !error &&
            (((!label_mode || label_mode === "icon") &&
              !this.badge.state_color) ||
              clsLabel),
        })}
        style=${styleMap({
          "border-color": this.borderColor,
          "--color": !this.badge.state_color ? this.badge.color : undefined,
          "--background-color": this.badge.background_color,
          "background-image": clsImageOnly
            ? `url(${this.hass.hassUrl(this.badge.image)})`
            : undefined,
          "--font-size": this.badge.hide_unit
            ? `var(--ha-font-size-m)`
            : `var(--ha-font-size-xs)`,
        })}
        @click=${this._badgeTap}
      >
        ${!label_mode && stateObj
          ? html`<state-badge
              .hass=${this.hass}
              .stateObj=${stateObj}
              .overrideIcon=${icon}
              .overrideImage=${this.badge.image}
              .stateColor=${this.badge.state_color}
            ></state-badge>`
          : nothing}
        ${label_mode === "icon"
          ? html`<state-badge
              .hass=${this.hass}
              .stateObj=${stateObj}
              .overrideIcon=${icon}
              .stateColor=${this.badge.state_color}
            ></state-badge>`
          : nothing}
        ${label_mode === "image" && stateObj
          ? html`<state-badge
              .hass=${this.hass}
              .stateObj=${stateObj}
              .overrideImage=${this.badge.image}
            ></state-badge>`
          : nothing}
        ${clsLabel ? label : nothing}
        ${error
          ? html`<div class="error">
              <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>
            </div>`
          : nothing}
      </div>
    `;
  }

  private _badgeTap(ev: Event) {
    ev.stopPropagation();
    if (this.badge.entity) {
      fireEvent(this, "hass-more-info", { entityId: this.badge.entity });
    }
  }

  static styles = css`
    :host {
      position: absolute;
      --badge-ratio: 2.5; /* ratio of marker size to badge size */
      --icon-ratio: 1.5; /* ratio of badge size to icon size */

      --mdc-icon-size: calc(
        var(--ha-marker-size, 48px) / var(--badge-ratio) / var(--icon-ratio)
      );

      /* badge size used to define width & height */
      --badge-size: calc(var(--ha-marker-size, 48px) / var(--badge-ratio));

      top: calc(var(--badge-size) * 0.25 * -1);
      left: calc(var(--ha-marker-size, 48px) - var(--badge-size) * 0.75);
      inset-inline-start: calc(
        var(--ha-marker-size, 48px) - var(--badge-size) * 0.75
      );
      inset-inline-end: initial;
    }
    .badge {
      display: flex;
      justify-content: center;
      align-items: center;
      line-height: 0;
      width: var(--badge-size);
      height: var(--badge-size);
      box-sizing: border-box;
      border: 1px solid var(--ha-marker-color, var(--primary-color));
      border-radius: var(--ha-marker-badge-border-radius, 50%);
      background-color: var(--background-color, var(--card-background-color));
      transition: background-color 280ms ease-in-out;
    }
    .image-only {
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center;
    }
    .label {
      /* 0.7 - coefficient to get smaller fonts than ha-font-size-xs */
      font-size: var(
        --ha-marker-badge-font-size,
        calc(var(--font-size) * 0.7 * var(--ha-marker-size, 48px) / 48px)
      );
      font-weight: var(--ha-font-weight-light);
      text-align: center;
      line-height: var(--ha-line-height-condensed);
    }
    state-badge {
      width: 100%;
      height: 100%;
    }
    .colored.label,
    .colored state-badge {
      color: var(--color);
    }
    .error {
      color: #fce588; /* same color used in state-badge for "missing" class */
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-map-marker-badge": HaMapMarkerBadge;
  }
}
