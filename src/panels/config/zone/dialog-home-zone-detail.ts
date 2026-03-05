import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-wa-dialog";
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

@customElement("dialog-home-zone-detail")
class DialogHomeZoneDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: Record<string, string>;

  @state() private _data?: HomeZoneMutableParams;

  @state() private _params?: HomeZoneDetailDialogParams;

  @state() private _open = false;

  @state() private _submitting = false;

  public showDialog(params: HomeZoneDetailDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._data = {
      name: this.hass.config.location_name,
      latitude: this.hass.config.latitude,
      longitude: this.hass.config.longitude,
      radius: this.hass.config.radius,
    };
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
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
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass!.localize("ui.common.edit_item", {
          name: this._data.name,
        })}
        @closed=${this._dialogClosed}
      >
        <ha-form
          autofocus
          .hass=${this.hass}
          .schema=${SCHEMA}
          .data=${this._formData(this._data)}
          .error=${this._error}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
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
        </ha-dialog-footer>
      </ha-wa-dialog>
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
    return [haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-home-zone-detail": DialogHomeZoneDetail;
  }
}
