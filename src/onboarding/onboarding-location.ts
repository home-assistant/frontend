import "@material/mwc-button/mwc-button";
import {
  mdiCrosshairsGps,
  mdiMagnify,
  mdiMapMarker,
  mdiMapSearchOutline,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-alert";
import "../components/ha-formfield";
import "../components/ha-radio";
import "../components/ha-textfield";
import type { HaTextField } from "../components/ha-textfield";
import "../components/map/ha-locations-editor";
import type {
  HaLocationsEditor,
  MarkerLocation,
} from "../components/map/ha-locations-editor";
import { ConfigUpdateValues, detectCoreConfig } from "../data/core";
import { showConfirmationDialog } from "../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import {
  OpenStreetMapPlace,
  reverseGeocode,
  searchPlaces,
} from "../data/openstreetmap";
import { onBoardingStyles } from "./styles";

const AMSTERDAM: [number, number] = [52.3731339, 4.8903147];
const mql = matchMedia("(prefers-color-scheme: dark)");
const LOCATION_MARKER_ID = "location";

@customElement("onboarding-location")
class OnboardingLocation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public onboardingLocalize!: LocalizeFunc;

  @state() private _working = false;

  @state() private _location: [number, number] = AMSTERDAM;

  @state() private _places?: OpenStreetMapPlace[] | null;

  @state() private _error?: string;

  @state() private _search = false;

  @state() private _highlightedMarker?: number;

  private _elevation?: string;

  private _unitSystem?: ConfigUpdateValues["unit_system"];

  private _currency?: ConfigUpdateValues["currency"];

  private _timeZone?: ConfigUpdateValues["time_zone"];

  private _country?: ConfigUpdateValues["country"];

  @query("ha-locations-editor", true) private map!: HaLocationsEditor;

  protected render(): TemplateResult {
    const addressAttribution = this.onboardingLocalize(
      "ui.panel.page-onboarding.core-config.location_address",
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
          >${this.onboardingLocalize(
            "ui.panel.page-onboarding.core-config.osm_privacy_policy"
          )}</a
        >`,
      }
    );

    return html`
      <h1>
        ${this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.location_header"
        )}
      </h1>
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : nothing}

      <p>
        ${this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.intro_location"
        )}
      </p>

      <div class="location-search">
        <ha-textfield
          label=${this.onboardingLocalize(
            "ui.panel.page-onboarding.core-config.address_label"
          )}
          .disabled=${this._working}
          icon
          iconTrailing
          @keyup=${this._addressSearch}
        >
          <ha-svg-icon slot="leadingIcon" .path=${mdiMagnify}></ha-svg-icon>
          ${this._working
            ? html`
                <ha-circular-progress
                  slot="trailingIcon"
                  active
                  size="small"
                ></ha-circular-progress>
              `
            : html`
                <ha-icon-button
                  @click=${this._handleButtonClick}
                  slot="trailingIcon"
                  .disabled=${this._working}
                  .label=${this.onboardingLocalize(
                    this._search
                      ? "ui.common.search"
                      : "ui.panel.page-onboarding.core-config.button_detect"
                  )}
                  .path=${this._search ? mdiMapSearchOutline : mdiCrosshairsGps}
                ></ha-icon-button>
              `}
        </ha-textfield>
        ${this._places !== undefined
          ? html`
              <mwc-list activatable>
                ${this._places?.length
                  ? this._places.map((place) => {
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
                      return html`<ha-list-item
                        @click=${this._itemClicked}
                        .placeId=${place.place_id}
                        .selected=${this._highlightedMarker === place.place_id}
                        .activated=${this._highlightedMarker === place.place_id}
                        .twoline=${primary && secondary}
                      >
                        ${primary || secondary}
                        <span slot="secondary"
                          >${primary ? secondary : ""}</span
                        >
                      </ha-list-item>`;
                    })
                  : html`<ha-list-item noninteractive
                      >${this._places === null
                        ? ""
                        : "No results"}</ha-list-item
                    >`}
              </mwc-list>
            `
          : nothing}
      </div>
      <ha-locations-editor
        class="flex"
        .hass=${this.hass}
        .locations=${this._markerLocations(
          this._location,
          this._places,
          this._highlightedMarker
        )}
        zoom="14"
        .darkMode=${mql.matches}
        .disabled=${this._working}
        @location-updated=${this._locationChanged}
        @marker-clicked=${this._markerClicked}
      ></ha-locations-editor>

      <p class="attribution">${addressAttribution}</p>

      <div class="footer">
        <mwc-button @click=${this._save} unelevated .disabled=${this._working}>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.core-config.finish"
          )}
        </mwc-button>
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    setTimeout(
      () => this.renderRoot.querySelector("ha-textfield")!.focus(),
      100
    );
    this.addEventListener("keyup", (ev) => {
      if (ev.key === "Enter") {
        this._save(ev);
      }
    });
  }

  protected updated(changedProps) {
    if (changedProps.has("_highlightedMarker") && this._highlightedMarker) {
      const place = this._places?.find(
        (plc) => plc.place_id === this._highlightedMarker
      );
      if (place?.boundingbox?.length === 4) {
        this.map.fitBounds(
          [
            [place.boundingbox[0], place.boundingbox[2]],
            [place.boundingbox[1], place.boundingbox[3]],
          ],
          { zoom: 16, pad: 0 }
        );
      } else {
        this.map.fitMarker(String(this._highlightedMarker), { zoom: 16 });
      }
    }
  }

  private _markerLocations = memoizeOne(
    (
      location?: [number, number],
      places?: OpenStreetMapPlace[] | null,
      highlightedMarker?: number
    ): MarkerLocation[] => {
      if (!places) {
        return [
          {
            id: LOCATION_MARKER_ID,
            latitude: (location || AMSTERDAM)[0],
            longitude: (location || AMSTERDAM)[1],
            location_editable: true,
          },
        ];
      }
      return places?.length
        ? places.map((place) => ({
            id: String(place.place_id),
            iconPath:
              place.place_id === highlightedMarker ? undefined : mdiMapMarker,
            latitude:
              location && place.place_id === highlightedMarker
                ? location[0]
                : Number(place.lat),
            longitude:
              location && place.place_id === highlightedMarker
                ? location[1]
                : Number(place.lon),
            location_editable: place.place_id === highlightedMarker,
          }))
        : [];
    }
  );

  private _locationChanged(ev) {
    this._location = ev.detail.location;
    if (ev.detail.id !== LOCATION_MARKER_ID) {
      this._reverseGeocode();
    }
  }

  private _markerClicked(ev) {
    if (ev.detail.id === LOCATION_MARKER_ID) {
      return;
    }
    this._highlightedMarker = ev.detail.id;
    const place = this._places!.find((plc) => plc.place_id === ev.detail.id)!;
    this._location = [Number(place.lat), Number(place.lon)];
    this._country = place.address.country_code.toUpperCase();
  }

  private _itemClicked(ev) {
    this._highlightedMarker = ev.currentTarget.placeId;
    const place = this._places!.find(
      (plc) => plc.place_id === ev.currentTarget.placeId
    )!;
    this._location = [Number(place.lat), Number(place.lon)];
    this._country = place.address.country_code.toUpperCase();
  }

  private async _addressSearch(ev: KeyboardEvent) {
    ev.stopPropagation();
    this._search = (ev.currentTarget as HaTextField).value.length > 0;
    if (ev.key !== "Enter") {
      return;
    }
    this._searchAddress((ev.currentTarget as HaTextField).value);
  }

  private async _searchAddress(address: string) {
    this._working = true;
    this._highlightedMarker = undefined;
    this._error = undefined;
    this._places = null;
    this.map.addEventListener(
      "markers-updated",
      () => {
        setTimeout(() => {
          if ((this._places?.length || 0) > 2) {
            this.map.fitMap({ pad: 0.5 });
          }
        }, 500);
      },
      {
        once: true,
      }
    );
    try {
      this._places = await searchPlaces(address, this.hass, true, 3);
      if (this._places?.length) {
        this._highlightedMarker = this._places[0].place_id;
        this._location = [
          Number(this._places[0].lat),
          Number(this._places[0].lon),
        ];
        this._country = this._places[0].address.country_code.toUpperCase();
      }
    } catch (e: any) {
      this._places = undefined;
      this._error = e.message;
    } finally {
      this._working = false;
    }
  }

  private async _reverseGeocode() {
    if (!this._location) {
      return;
    }
    this._places = null;
    const reverse = await reverseGeocode(this._location, this.hass);
    this._country = reverse.address.country_code.toUpperCase();
    this._places = [reverse];
    this._highlightedMarker = reverse.place_id;
  }

  private async _handleButtonClick(ev) {
    if (this._search) {
      this._searchAddress(ev.target.parentElement.value);
      return;
    }
    this._detectLocation();
  }

  private _detectLocation() {
    if (window.isSecureContext && navigator.geolocation) {
      this._working = true;
      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      };
      navigator.geolocation.getCurrentPosition(
        async (result) => {
          this.map.addEventListener(
            "markers-updated",
            () => {
              this.map.fitMarker(LOCATION_MARKER_ID);
            },
            {
              once: true,
            }
          );
          this._location = [result.coords.latitude, result.coords.longitude];
          if (result.coords.altitude) {
            this._elevation = String(Math.round(result.coords.altitude));
          }
          try {
            await this._reverseGeocode();
          } finally {
            this._working = false;
          }
        },
        () => {
          // GPS is not available, get location based on IP
          this._working = false;
          this._whoAmI();
        },
        options
      );
    } else {
      this._whoAmI();
    }
  }

  private async _whoAmI() {
    const confirm = await showConfirmationDialog(this, {
      title: this.onboardingLocalize(
        "ui.panel.page-onboarding.core-config.title_location_detect"
      ),
      text: this.onboardingLocalize(
        "ui.panel.page-onboarding.core-config.intro_location_detect"
      ),
    });
    if (!confirm) {
      return;
    }
    this._working = true;
    try {
      const values = await detectCoreConfig(this.hass);

      if (values.latitude && values.longitude) {
        this.map.addEventListener(
          "markers-updated",
          () => {
            this.map.fitMarker(LOCATION_MARKER_ID);
          },
          {
            once: true,
          }
        );
        this._location = [Number(values.latitude), Number(values.longitude)];
      }
      if (values.elevation) {
        this._elevation = String(values.elevation);
      }
      if (values.unit_system) {
        this._unitSystem = values.unit_system;
      }
      if (values.time_zone) {
        this._timeZone = values.time_zone;
      }
      if (values.currency) {
        this._currency = values.currency;
      }
      if (values.country) {
        this._country = values.country;
      }
    } catch (err: any) {
      this._error = `Failed to detect location information: ${err.message}`;
    } finally {
      this._working = false;
    }
  }

  private async _save(ev) {
    if (!this._location) {
      return;
    }
    ev.preventDefault();
    fireEvent(this, "value-changed", {
      value: {
        location: this._location!,
        country: this._country,
        elevation: this._elevation,
        unit_system: this._unitSystem,
        time_zone: this._timeZone,
        currency: this._currency,
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        .location-search {
          margin-top: 32px;
          margin-bottom: 32px;
        }
        ha-textfield {
          display: block;
        }
        ha-textfield > ha-icon-button {
          position: absolute;
          top: 10px;
          right: 10px;
          --mdc-icon-button-size: 36px;
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
          inset-inline-start: initial;
          inset-inline-end: 10px;
          direction: var(--direction);
        }
        ha-textfield > ha-circular-progress {
          position: relative;
          left: 12px;
        }
        ha-locations-editor {
          display: block;
          height: 300px;
          margin-top: 8px;
          border-radius: var(--mdc-shape-large, 16px);
          overflow: hidden;
        }
        mwc-list {
          width: 100%;
          border: 1px solid var(--divider-color);
          box-sizing: border-box;
          border-top-width: 0;
          border-bottom-left-radius: var(--mdc-shape-small, 4px);
          border-bottom-right-radius: var(--mdc-shape-small, 4px);
          --mdc-list-vertical-padding: 0;
        }
        ha-list-item {
          height: 72px;
        }
        .attribution {
          /* textfield helper style */
          margin: 0;
          padding: 4px 16px 12px 16px;
          color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6));
          font-family: var(
            --mdc-typography-caption-font-family,
            var(--mdc-typography-font-family, Roboto, sans-serif)
          );
          font-size: var(--mdc-typography-caption-font-size, 0.75rem);
          font-weight: var(--mdc-typography-caption-font-weight, 400);
          letter-spacing: var(
            --mdc-typography-caption-letter-spacing,
            0.0333333333em
          );
          text-decoration: var(
            --mdc-typography-caption-text-decoration,
            inherit
          );
          text-transform: var(--mdc-typography-caption-text-transform, inherit);
        }
        .attribution a {
          color: inherit;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-location": OnboardingLocation;
  }
}
