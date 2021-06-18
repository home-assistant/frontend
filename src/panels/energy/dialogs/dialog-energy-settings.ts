import { LitElement, TemplateResult, html, CSSResultGroup, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { EnergySettingsDialogParams } from "./show-dialog-energy-settings";
import "../ha-energy-settings";
import { createCloseHeading } from "../../../components/ha-dialog";
import { getEnergyPreferences } from "../../../data/energy";
import type { EnergySettings } from "../ha-energy-settings";

@customElement("dialog-energy-settings")
export class DialogEnergySettings
  extends LitElement
  implements HassDialog<EnergySettingsDialogParams> {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: Required<EnergySettingsDialogParams>;

  public async showDialog(params: EnergySettingsDialogParams): Promise<void> {
    if (!params.preferences) {
      try {
        params.preferences = await getEnergyPreferences(this.hass);
      } catch (e) {
        params.preferences = {};
      }
    }
    this._params = params as Required<EnergySettingsDialogParams>;
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.energy.settings.header")
        )}
        @closed=${this.closeDialog}
      >
        <ha-energy-settings
          .hass=${this.hass}
          .preferences=${this._params.preferences}
          @value-changed=${this._prefsChanged}
        ></ha-energy-settings>
        <mwc-button @click=${this._savePrefs} slot="primaryAction">
          ${this.hass.localize("ui.common.save")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _prefsChanged(ev: CustomEvent) {
    this._params!.preferences = ev.detail.value;
  }

  private async _savePrefs() {
    try {
      await (this.shadowRoot!.querySelector(
        "ha-energy-settings"
      ) as EnergySettings).savePreferences();
      this._params!.savedCallback();
      this.closeDialog();
    } catch (e) {
      // don't close
    }
  }

  static get styles(): CSSResultGroup {
    return [haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-settings": DialogEnergySettings;
  }
}
