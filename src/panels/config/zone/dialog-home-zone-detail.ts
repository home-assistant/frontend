import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-form/ha-form";
import "../../../components/ha-button";
import type { HomeZoneMutableParams } from "../../../data/zone";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { HomeZoneDetailDialogParams } from "./show-dialog-home-zone-detail";

const SCHEMA = [
  {
    name: "location",
    required: true,
    selector: { location: { radius: true } },
  },
];

class DialogHomeZoneDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: Record<string, string>;

  @state() private _data?: HomeZoneMutableParams;

  @state() private _params?: HomeZoneDetailDialogParams;

  @state() private _submitting = false;

  public showDialog(params: HomeZoneDetailDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._data = {
      latitude: this.hass.config.latitude,
      longitude: this.hass.config.longitude,
      radius: this.hass.config.radius,
    };
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
    const latInvalid = String(this._data.latitude) === "";
    const lngInvalid = String(this._data.longitude) === "";

    const valid = !latInvalid && !lngInvalid;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass!.localize("ui.panel.config.zone.edit_home")
        )}
      >
        <div>
          <ha-form
            .hass=${this.hass}
            .schema=${SCHEMA}
            .data=${this._formData(this._data)}
            .error=${this._error}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <ha-button
          slot="primaryAction"
          appearance="plain"
          @click=${this.closeDialog}
        >
          ${this.hass!.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${!valid || this._submitting}
        >
          ${this.hass!.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _formData = memoizeOne((data: HomeZoneMutableParams) => ({
    ...data,
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius || 100,
    },
  }));

  private _valueChanged(ev: CustomEvent) {
    this._error = undefined;
    const value = { ...ev.detail.value };
    value.latitude = value.location.latitude;
    value.longitude = value.location.longitude;
    value.radius = value.location.radius;
    delete value.location;
    this._data = value;
  }

  private _computeLabel = (): string => "";

  private async _updateEntry() {
    this._submitting = true;
    try {
      await this._params!.updateEntry!(this._data!);
      this.closeDialog();
    } catch (err: any) {
      this._error = { base: err ? err.message : "Unknown error" };
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
              100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left)
            );
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-home-zone-detail": DialogHomeZoneDetail;
  }
}

customElements.define("dialog-home-zone-detail", DialogHomeZoneDetail);
