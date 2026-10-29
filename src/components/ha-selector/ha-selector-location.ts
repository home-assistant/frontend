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
import {
  formatOpenStreetMapPlace,
  searchPlaces,
} from "../../data/openstreetmap";
import type { HomeAssistant } from "../../types";
import type { SchemaUnion } from "../ha-form/types";
import type {
  HaLocationsEditor,
  MarkerLocation,
} from "../map/ha-locations-editor";
import "../map/ha-locations-editor";
import "../ha-form/ha-form";
import "../ha-alert";
import "../ha-icon-button";
import "../item/ha-list-item-button";
import "../list/ha-list-base";
import "../ha-spinner";
import "../ha-svg-icon";
import "../input/ha-input";
import type { HaInput } from "../input/ha-input";

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

  @state() private _searchError = false;

  @query("ha-input") private _input?: HaInput;

  @query("ha-locations-editor") private _map!: HaLocationsEditor;

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
            "ui.components.selectors.location.address_label"
          )}
          .disabled=${this.disabled}
          @input=${this._inputChanged}
          @keydown=${this._addressSearch}
        >
          <ha-svg-icon slot="start" .path=${mdiMagnify}></ha-svg-icon>

          <ha-icon-button
            slot="end"
            .path=${mdiMapSearchOutline}
            .label=${this.hass.localize("ui.common.search")}
            .disabled=${this.disabled}
            @click=${this._searchButtonClicked}
          ></ha-icon-button>
          ${this._working ? html`<ha-spinner slot="end" size="small"></ha-spinner>` : nothing}
        </ha-input>

        ${
          this._searchError
            ? html`<ha-alert alert-type="error">
                ${this.hass.localize(
                  "ui.components.selectors.location.search_error"
                )}
              </ha-alert>`
            : nothing
        }
        <div
          class="visually-hidden"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          ${
            this._working
              ? this.hass.localize("ui.components.selectors.location.searching")
              : Array.isArray(this._places)
                ? this._places.length
                  ? this.hass.localize(
                      "ui.components.selectors.location.search_results",
                      { count: this._places.length }
                    )
                  : this.hass.localize(
                      "ui.components.selectors.location.search_no_results"
                    )
                : ""
          }
        </div>
        ${
          Array.isArray(this._places) && this._places.length
            ? html`
                <ha-list-base
                  aria-label=${this.hass.localize(
                    "ui.components.selectors.location.search_results_label"
                  )}
                >
                  ${this._places.map(this._renderPlace)}
                </ha-list-base>
              `
            : this._places?.length === 0
              ? html`<p class="search-no-results">
                  ${this.hass.localize(
                    "ui.components.selectors.location.search_no_results"
                  )}
                </p>`
              : nothing
        }

        <p class="attribution">
          ${this.hass.localize(
            "ui.components.selectors.location.location_address",
            {
              openstreetmap: html`<a
                href="https://www.openstreetmap.org/"
                target="_blank"
                rel="noopener noreferrer"
                >OpenStreetMap</a
              >`,
              osm_privacy_policy: html`<a
                href="https://wiki.osmfoundation.org/wiki/Privacy_Policy"
                target="_blank"
                rel="noopener noreferrer"
                >${this.hass.localize(
                  "ui.components.selectors.location.osm_privacy_policy"
                )}</a
              >`,
            }
          )}
        </p>
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
    if (ev.key !== "Enter" || ev.isComposing) {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    this._searchPlaces(this._input?.value ?? "");
  }

  private _inputChanged(): void {
    this._places = undefined;
    this._searchError = false;
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
    this._searchError = false;

    try {
      const places = await searchPlaces(address.trim(), this.hass, true, 3);
      if (this._input?.value?.trim() === address.trim()) {
        this._places = places;
      }
    } catch (_err) {
      if (this._input?.value?.trim() === address.trim()) {
        this._places = undefined;
        this._searchError = true;
      }
    } finally {
      this._working = false;
    }
  }

  private _renderPlace = (place: OpenStreetMapPlace) => {
    const { primary, secondary } = formatOpenStreetMapPlace(place);
    const placeType = this.hass.localize(
      "ui.components.selectors.location.place_type",
      { type: place.type.replaceAll("_", " ") }
    );
    const details = [placeType, secondary].filter(Boolean).join(", ");
    const title = primary || secondary;

    return html`
      <ha-list-item-button
        @click=${this._placeSelected}
        .disabled=${this.disabled}
        .placeId=${place.place_id}
        .twoline=${Boolean(title && details)}
      >
        ${title}
        ${
          title && details
            ? html`<span slot="secondary">${details}</span>`
            : nothing
        }
      </ha-list-item-button>
    `;
  };

  private async _placeSelected(ev: Event) {
    if (this.disabled) {
      return;
    }

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
    await this.updateComplete;
    await this._map.fitMarker("location");
  }

  static styles = css`
    .location-search {
      margin-bottom: var(--ha-space-4);
    }

    .attribution {
      margin: var(--ha-space-2) 0 0;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-xs);
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .search-no-results {
      margin: 0;
      padding: var(--ha-space-2) var(--ha-space-4);
      color: var(--secondary-text-color);
    }

    ha-list-base {
      width: 100%;
      border: 1px solid var(--divider-color);
      box-sizing: border-box;
      border-radius: var(--ha-border-radius-sm, 4px);
      --ha-list-padding: 0;
    }

    ha-list-item-button {
      min-height: 56px;
    }

    ha-locations-editor {
      display: block;
      --ha-locations-editor-map-height: 400px;
      margin-bottom: var(--ha-space-4);
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
