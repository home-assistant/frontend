import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  LocationSelector,
  LocationSelectorValue,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import type { SchemaUnion } from "../ha-form/types";
import type { MarkerLocation } from "../map/ha-locations-editor";
import "../map/ha-locations-editor";
import "../ha-form/ha-form";
import type { LocalizeFunc } from "../../common/translations/localize";

@customElement("ha-selector-location")
export class HaLocationSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: LocationSelector;

  @property({ type: Object }) public value?: LocationSelectorValue;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc, radius?: boolean, radius_readonly?: boolean) =>
      [
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "latitude",
              required: true,
              selector: { number: { step: "any", unit_of_measurement: "°" } },
            },
            {
              name: "longitude",
              required: true,
              selector: { number: { step: "any", unit_of_measurement: "°" } },
            },
          ],
        },
        ...(radius
          ? [
              {
                name: "radius",
                required: true,
                default: 1000,
                disabled: !!radius_readonly,
                selector: {
                  number: {
                    min: 0,
                    step: 1,
                    mode: "box",
                    unit_of_measurement: localize(
                      "ui.components.selectors.location.radius_meters"
                    ),
                  } as const,
                },
              } as const,
            ]
          : []),
      ] as const
  );

  protected willUpdate() {
    if (!this.value) {
      this.value = {
        latitude: this.hass.config.latitude,
        longitude: this.hass.config.longitude,
        radius: this.selector.location?.radius ? 1000 : undefined,
      };
    }
  }

  protected render() {
    return html`
      <p>${this.label ? this.label : ""}</p>
      <ha-locations-editor
        class="flex"
        .hass=${this.hass}
        .helper=${this.helper}
        .locations=${this._location(this.selector, this.value)}
        @location-updated=${this._locationChanged}
        @radius-updated=${this._radiusChanged}
        pin-on-click
      ></ha-locations-editor>
      <ha-form
        .hass=${this.hass}
        .schema=${this._schema(
          this.hass.localize,
          this.selector.location?.radius,
          this.selector.location?.radius_readonly
        )}
        .data=${this.value}
        .computeLabel=${this._computeLabel}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _location = memoizeOne(
    (
      selector: LocationSelector,
      value?: LocationSelectorValue
    ): MarkerLocation[] => {
      const computedStyles = getComputedStyle(this);
      const zoneRadiusColor = selector.location?.radius
        ? computedStyles.getPropertyValue("--zone-radius-color") ||
          computedStyles.getPropertyValue("--accent-color")
        : undefined;
      return [
        {
          id: "location",
          latitude:
            !value || isNaN(value.latitude)
              ? this.hass.config.latitude
              : value.latitude,
          longitude:
            !value || isNaN(value.longitude)
              ? this.hass.config.longitude
              : value.longitude,
          radius: selector.location?.radius ? value?.radius || 1000 : undefined,
          radius_color: zoneRadiusColor,
          icon:
            selector.location?.icon || selector.location?.radius
              ? "mdi:map-marker-radius"
              : "mdi:map-marker",
          location_editable: true,
          radius_editable:
            !!selector.location?.radius && !selector.location?.radius_readonly,
        },
      ];
    }
  );

  private _locationChanged(ev: CustomEvent) {
    const [latitude, longitude] = ev.detail.location;
    fireEvent(this, "value-changed", {
      value: { ...this.value, latitude, longitude },
    });
  }

  private _radiusChanged(ev: CustomEvent) {
    const radius = Math.round(ev.detail.radius);
    fireEvent(this, "value-changed", { value: { ...this.value, radius } });
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;
    const radius = Math.round(ev.detail.value.radius);

    fireEvent(this, "value-changed", {
      value: {
        latitude: value.latitude,
        longitude: value.longitude,
        ...(this.selector.location?.radius &&
        !this.selector.location?.radius_readonly
          ? {
              radius,
            }
          : {}),
      },
    });
  }

  private _computeLabel = (
    entry: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    if (entry.name) {
      return this.hass.localize(
        `ui.components.selectors.location.${entry.name}`
      );
    }
    return "";
  };

  static styles = css`
    ha-locations-editor {
      display: block;
      height: 400px;
      margin-bottom: 16px;
    }
    p {
      margin-top: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-location": HaLocationSelector;
  }
}
