import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { addDistanceToCoord } from "../../../common/location/add_distance_to_coord";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-formfield";
import "../../../components/ha-switch";
import "../../../components/map/ha-locations-editor";
import type { MarkerLocation } from "../../../components/map/ha-locations-editor";
import { getZoneEditorInitData, ZoneMutableParams } from "../../../data/zone";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { ZoneDetailDialogParams } from "./show-dialog-zone-detail";

class DialogZoneDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _latitude!: number;

  @state() private _longitude!: number;

  @state() private _passive!: boolean;

  @state() private _radius!: number;

  @state() private _error?: string;

  @state() private _params?: ZoneDetailDialogParams;

  @state() private _submitting = false;

  public showDialog(params: ZoneDetailDialogParams): void {
    this._params = params;
    this._error = undefined;
    if (this._params.entry) {
      this._name = this._params.entry.name || "";
      this._icon = this._params.entry.icon || "";
      this._latitude = this._params.entry.latitude || this.hass.config.latitude;
      this._longitude =
        this._params.entry.longitude || this.hass.config.longitude;
      this._passive = this._params.entry.passive || false;
      this._radius = this._params.entry.radius || 100;
    } else {
      const initConfig = getZoneEditorInitData();
      let movedHomeLocation;
      if (!initConfig?.latitude || !initConfig?.longitude) {
        movedHomeLocation = addDistanceToCoord(
          [this.hass.config.latitude, this.hass.config.longitude],
          Math.random() * 500 * (Math.random() < 0.5 ? -1 : 1),
          Math.random() * 500 * (Math.random() < 0.5 ? -1 : 1)
        );
      }
      this._latitude = initConfig?.latitude || movedHomeLocation[0];
      this._longitude = initConfig?.longitude || movedHomeLocation[1];
      this._name = initConfig?.name || "";
      this._icon = initConfig?.icon || "mdi:map-marker";

      this._passive = false;
      this._radius = 100;
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const nameValid = this._name.trim() === "";
    const iconValid = !this._icon.trim().includes(":");
    const latValid = String(this._latitude) === "";
    const lngValid = String(this._longitude) === "";
    const radiusValid = String(this._radius) === "";

    const valid =
      !nameValid && !iconValid && !latValid && !lngValid && !radiusValid;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.entry
            ? this._params.entry.name
            : this.hass!.localize("ui.panel.config.zone.detail.new_zone")
        )}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <div class="form">
            <paper-input
              dialogInitialFocus
              .value=${this._name}
              .configValue=${"name"}
              @value-changed=${this._valueChanged}
              .label="${this.hass!.localize(
                "ui.panel.config.zone.detail.name"
              )}"
              .errorMessage="${this.hass!.localize(
                "ui.panel.config.zone.detail.required_error_msg"
              )}"
              required
              auto-validate
            ></paper-input>
            <paper-input
              .value=${this._icon}
              .configValue=${"icon"}
              @value-changed=${this._valueChanged}
              .label="${this.hass!.localize(
                "ui.panel.config.zone.detail.icon"
              )}"
              .errorMessage="${this.hass!.localize(
                "ui.panel.config.zone.detail.icon_error_msg"
              )}"
              .invalid=${iconValid}
            ></paper-input>
            <ha-locations-editor
              class="flex"
              .hass=${this.hass}
              .locations=${this._location(
                this._latitude,
                this._longitude,
                this._radius,
                this._passive,
                this._icon
              )}
              @location-updated=${this._locationChanged}
              @radius-updated=${this._radiusChanged}
            ></ha-locations-editor>
            <div class="location">
              <paper-input
                .value=${this._latitude}
                .configValue=${"latitude"}
                @value-changed=${this._valueChanged}
                .label="${this.hass!.localize(
                  "ui.panel.config.zone.detail.latitude"
                )}"
                .errorMessage="${this.hass!.localize(
                  "ui.panel.config.zone.detail.required_error_msg"
                )}"
                .invalid=${latValid}
              ></paper-input>
              <paper-input
                .value=${this._longitude}
                .configValue=${"longitude"}
                @value-changed=${this._valueChanged}
                .label="${this.hass!.localize(
                  "ui.panel.config.zone.detail.longitude"
                )}"
                .errorMessage="${this.hass!.localize(
                  "ui.panel.config.zone.detail.required_error_msg"
                )}"
                .invalid=${lngValid}
              ></paper-input>
            </div>
            <paper-input
              .value=${this._radius}
              .configValue=${"radius"}
              @value-changed=${this._valueChanged}
              .label="${this.hass!.localize(
                "ui.panel.config.zone.detail.radius"
              )}"
              .errorMessage="${this.hass!.localize(
                "ui.panel.config.zone.detail.required_error_msg"
              )}"
              .invalid=${radiusValid}
            ></paper-input>
            <p>
              ${this.hass!.localize("ui.panel.config.zone.detail.passive_note")}
            </p>
            <ha-formfield
              .label=${this.hass!.localize(
                "ui.panel.config.zone.detail.passive"
              )}
              .dir=${computeRTLDirection(this.hass)}
            >
              <ha-switch
                .checked=${this._passive}
                @change=${this._passiveChanged}
              ></ha-switch>
            </ha-formfield>
          </div>
        </div>
        ${this._params.entry
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click="${this._deleteEntry}"
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.panel.config.zone.detail.delete")}
              </mwc-button>
            `
          : html``}
        <mwc-button
          slot="primaryAction"
          @click="${this._updateEntry}"
          .disabled=${!valid || this._submitting}
        >
          ${this._params.entry
            ? this.hass!.localize("ui.panel.config.zone.detail.update")
            : this.hass!.localize("ui.panel.config.zone.detail.create")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _location = memoizeOne(
    (
      lat: number,
      lng: number,
      radius: number,
      passive: boolean,
      icon: string
    ): MarkerLocation[] => {
      const computedStyles = getComputedStyle(this);
      const zoneRadiusColor = computedStyles.getPropertyValue("--accent-color");
      const passiveRadiusColor = computedStyles.getPropertyValue(
        "--secondary-text-color"
      );
      return [
        {
          id: "location",
          latitude: Number(lat),
          longitude: Number(lng),
          radius,
          radius_color: passive ? passiveRadiusColor : zoneRadiusColor,
          icon,
          location_editable: true,
          radius_editable: true,
        },
      ];
    }
  );

  private _locationChanged(ev: CustomEvent) {
    [this._latitude, this._longitude] = ev.detail.location;
  }

  private _radiusChanged(ev: CustomEvent) {
    this._radius = ev.detail.radius;
  }

  private _passiveChanged(ev) {
    this._passive = ev.target.checked;
  }

  private _valueChanged(ev: CustomEvent) {
    const configValue = (ev.target as any).configValue;

    this._error = undefined;
    this[`_${configValue}`] = ev.detail.value;
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      const values: ZoneMutableParams = {
        name: this._name.trim(),
        icon: this._icon.trim(),
        latitude: this._latitude,
        longitude: this._longitude,
        passive: this._passive,
        radius: this._radius,
      };
      if (this._params!.entry) {
        await this._params!.updateEntry!(values);
      } else {
        await this._params!.createEntry(values);
      }
      this._params = undefined;
    } catch (err) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry!()) {
        this._params = undefined;
      }
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .location {
          display: flex;
        }
        .location > * {
          flex-grow: 1;
          min-width: 0;
        }
        .location > *:first-child {
          margin-right: 4px;
        }
        .location > *:last-child {
          margin-left: 4px;
        }
        ha-locations-editor {
          margin-top: 16px;
        }
        a {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zone-detail": DialogZoneDetail;
  }
}

customElements.define("dialog-zone-detail", DialogZoneDetail);
