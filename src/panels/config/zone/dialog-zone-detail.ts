import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { addDistanceToCoord } from "../../../common/location/add_distance_to_coord";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-form/ha-form";
import { SchemaUnion } from "../../../components/ha-form/types";
import { getZoneEditorInitData, ZoneMutableParams } from "../../../data/zone";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { ZoneDetailDialogParams } from "./show-dialog-zone-detail";

class DialogZoneDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: Record<string, string>;

  @state() private _data?: ZoneMutableParams;

  @state() private _params?: ZoneDetailDialogParams;

  @state() private _submitting = false;

  public showDialog(params: ZoneDetailDialogParams): void {
    this._params = params;
    this._error = undefined;
    if (this._params.entry) {
      this._data = this._params.entry;
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
      this._data = {
        latitude: initConfig?.latitude || movedHomeLocation[0],
        longitude: initConfig?.longitude || movedHomeLocation[1],
        name: initConfig?.name || "",
        icon: initConfig?.icon || "mdi:map-marker",
        passive: false,
        radius: 100,
      };
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }
    const nameInvalid = this._data.name.trim() === "";
    const iconInvalid = Boolean(
      this._data.icon && !this._data.icon.trim().includes(":")
    );
    const latInvalid = String(this._data.latitude) === "";
    const lngInvalid = String(this._data.longitude) === "";
    const radiusInvalid = String(this._data.radius) === "";

    const valid =
      !nameInvalid &&
      !iconInvalid &&
      !latInvalid &&
      !lngInvalid &&
      !radiusInvalid;

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
          <ha-form
            .hass=${this.hass}
            .schema=${this._schema(this._data.icon)}
            .data=${this._formData(this._data)}
            .error=${this._error}
            .computeLabel=${this._computeLabel}
            class=${this._data.passive ? "passive" : ""}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        ${this._params.entry
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click=${this._deleteEntry}
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.panel.config.zone.detail.delete")}
              </mwc-button>
            `
          : nothing}
        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${!valid || this._submitting}
        >
          ${this._params.entry
            ? this.hass!.localize("ui.panel.config.zone.detail.update")
            : this.hass!.localize("ui.panel.config.zone.detail.create")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _schema = memoizeOne(
    (icon?: string) =>
      [
        {
          name: "name",
          required: true,
          selector: {
            text: {},
          },
        },
        {
          name: "icon",
          required: false,
          selector: {
            icon: {},
          },
        },
        {
          name: "location",
          required: true,
          selector: { location: { radius: true, icon } },
        },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "latitude",
              required: true,
              selector: { text: {} },
            },
            {
              name: "longitude",
              required: true,

              selector: { text: {} },
            },
          ],
        },
        { name: "passive_note", type: "constant" },
        { name: "passive", selector: { boolean: {} } },
        {
          name: "radius",
          required: false,
          selector: { number: { min: 0, max: 999999, mode: "box" } },
        },
      ] as const
  );

  private _formData = memoizeOne((data: ZoneMutableParams) => ({
    ...data,
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius,
    },
  }));

  private _valueChanged(ev: CustomEvent) {
    this._error = undefined;
    const value = ev.detail.value;
    if (
      value.location.latitude !== this._data!.latitude ||
      value.location.longitude !== this._data!.longitude ||
      value.location.radius !== this._data!.radius
    ) {
      value.latitude = value.location.latitude;
      value.longitude = value.location.longitude;
      value.radius = Math.round(value.location.radius);
    }
    delete value.location;
    if (!value.icon) {
      delete value.icon;
    }
    this._data = value;
  }

  private _computeLabel = (
    entry: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => this.hass.localize(`ui.panel.config.zone.detail.${entry.name}`);

  private async _updateEntry() {
    this._submitting = true;
    try {
      if (this._params!.entry) {
        await this._params!.updateEntry!(this._data!);
      } else {
        await this._params!.createEntry(this._data!);
      }
      this.closeDialog();
    } catch (err: any) {
      this._error = { base: err ? err.message : "Unknown error" };
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
        ha-dialog {
          --mdc-dialog-min-width: min(600px, 95vw);
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: calc(
              100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
            );
          }
        }
        ha-form.passive {
          --zone-radius-color: var(--secondary-text-color);
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
