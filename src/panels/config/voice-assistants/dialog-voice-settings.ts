import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { createCloseHeading } from "../../../components/ha-dialog";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "./entity-voice-settings";
import { VoiceSettingsDialogParams } from "./show-dialog-voice-settings";

@customElement("dialog-voice-settings")
class DialogVoiceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: VoiceSettingsDialogParams;

  public showDialog(params: VoiceSettingsDialogParams): void {
    this._params = params;
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          computeStateName(this.hass.states[this._params.entityId]) ||
            this.hass.localize("ui.panel.config.entities.picker.unnamed_entity")
        )}
      >
        <div>
          <entity-voice-settings
            .hass=${this.hass}
            .entityId=${this._params.entityId}
            .entry=${this._params.extEntityReg}
            .exposed=${this._params.exposed}
            @entity-entry-updated=${this._entityEntryUpdated}
            @exposed-entities-changed=${this._exposedEntitiesChanged}
          ></entity-voice-settings>
        </div>
      </ha-dialog>
    `;
  }

  private _entityEntryUpdated(ev: CustomEvent) {
    this._params!.extEntityReg = ev.detail;
  }

  private _exposedEntitiesChanged() {
    this._params!.exposedEntitiesChanged?.();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-voice-settings": DialogVoiceSettings;
  }
}
