import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  LocationSelector,
  LocationSelectorValue,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import type { MarkerLocation } from "../map/ha-locations-editor";
import "../map/ha-locations-editor";

@customElement("ha-selector-location")
export class HaLocationSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: LocationSelector;

  @property() public value?: LocationSelectorValue;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

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
      ></ha-locations-editor>
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
          latitude: value?.latitude || this.hass.config.latitude,
          longitude: value?.longitude || this.hass.config.longitude,
          radius: selector.location?.radius ? value?.radius || 1000 : undefined,
          radius_color: zoneRadiusColor,
          icon:
            selector.location?.icon || selector.location?.radius
              ? "mdi:map-marker-radius"
              : "mdi:map-marker",
          location_editable: true,
          radius_editable: true,
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
    const radius = ev.detail.radius;
    fireEvent(this, "value-changed", { value: { ...this.value, radius } });
  }

  static styles = css`
    ha-locations-editor {
      display: block;
      height: 400px;
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
