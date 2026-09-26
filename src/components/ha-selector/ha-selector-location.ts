import { mdiMagnify, mdiMapSearchOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import type {
  LocationSelector,
  LocationSelectorValue,
} from "../../data/selector";
import type { OpenStreetMapPlace } from "../../data/openstreetmap";
import { searchPlaces } from "../../data/openstreetmap";
import type { HomeAssistant } from "../../types";
import type { SchemaUnion } from "../ha-form/types";
import type { MarkerLocation } from "../map/ha-locations-editor";
import "../map/ha-locations-editor";
import "../ha-form/ha-form";
import "../ha-icon-button";
import "../ha-list";
import "../ha-list-item";
import "../ha-spinner";
import "../ha-svg-icon";
import "../input/ha-input";

@customElement("ha-selector-location")
export class HaLocationSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: LocationSelector;

  @property({ type: Object }) public value?: LocationSelectorValue;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @state() private _working = false;

  @state() private _places?: OpenStreetMapPlace[] | null;

  @query("ha-input") private _input?: HTMLElement & { value?: string };

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

      <div class="location-search">
        <ha-input
          label=${this.hass.localize(
            "ui.panel.page-onboarding.core-config.address_label"
          )}
          .disabled=${this.disabled || this._working}
          @keyup=${this._addressSearch}
        >
          <ha-svg-icon slot="start" .path=${mdiMagnify}></ha-svg-icon>

          ${
            this._working
              ? html`<ha-spinner slot="end" size="small"></ha-spinner>`
              : html`
                  <ha-icon-button
                    slot="end"
                    .path=${mdiMapSearchOutline}
                    .label=${this.hass.localize("ui.common.search")}
                    .disabled=${this.disabled}
                    @click=${this._searchButtonClicked}
                  ></ha-icon-button>
                `
          }
        </ha-input>

        ${
          this._places !== undefined
            ? html`
                <ha-list activatable>
                  ${
                    this._places?.length
                      ? this._places.map(this._renderPlace)
                      : html`
                          <ha-list-item noninteractive>
                            No results
                          </ha-list-item>
                        `
                  }
                </ha-list>
              `
            : nothing
        }
      </div>

      <ha-locations-editor
        class="flex"
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
          radius_color: selector.location?.color || zoneRadiusColor,
          name: selector.location?.name,
          icon:
            selector.location?.icon ||
            // No icon: show the name's initials, else a default marker
            (selector.location?.name ? undefined : "mdi:map-marker"),
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

  private _addressSearch(ev: KeyboardEvent) {
    if (ev.key !== "Enter") {
      return;
    }

    ev.stopPropagation();

    this._searchPlaces(this._input?.value ?? "");
  }

  private _searchButtonClicked() {
    this._searchPlaces(this._input?.value ?? "");
  }

  private async _searchPlaces(address: string) {
    if (!address.trim() || this._working) {
      return;
    }

    this._working = true;
    this._places = null;

    try {
      this._places = await searchPlaces(address, this.hass, true, 3);
    } catch (_err) {
      this._places = undefined;
    } finally {
      this._working = false;
    }
  }

  private _renderPlace = (place: OpenStreetMapPlace) => {
    const primary = [
      place.name || place.address[place.category],
      place.address.house_number,
      place.address.road || place.address.waterway,
      place.address.village || place.address.town,
      place.address.suburb || place.address.subdivision,
      place.address.city || place.address.municipality,
    ]
      .filter(Boolean)
      .join(", ");

    const secondary = [
      place.address.county ||
        place.address.state_district ||
        place.address.region,
      place.address.state,
      place.address.country,
    ]
      .filter(Boolean)
      .join(", ");

    return html`
      <ha-list-item
        @click=${this._placeSelected}
        .placeId=${place.place_id}
        .twoline=${Boolean(primary && secondary)}
      >
        ${primary || secondary}
        ${
          primary && secondary
            ? html`<span slot="secondary">${secondary}</span>`
            : nothing
        }
      </ha-list-item>
    `;
  };

  private _placeSelected(ev: Event) {
    const placeId = (ev.currentTarget as HTMLElement & { placeId: number })
      .placeId;

    const place = this._places?.find((item) => item.place_id === placeId);

    if (!place) {
      return;
    }

    fireEvent(this, "value-changed", {
      value: {
        ...this.value,
        latitude: Number(place.lat),
        longitude: Number(place.lon),
      },
    });

    this._places = undefined;
  }

  static styles = css`
    .location-search {
      margin-bottom: 16px;
    }

    ha-list {
      width: 100%;
      border: 1px solid var(--divider-color);
      box-sizing: border-box;
      border-top-width: 0;
      border-bottom-left-radius: var(--mdc-shape-small, 4px);
      border-bottom-right-radius: var(--mdc-shape-small, 4px);
      --mdc-list-vertical-padding: 0;
    }

    ha-list-item {
      min-height: 56px;
    }

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
