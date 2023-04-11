import "@material/mwc-button/mwc-button";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  ExtEntityRegistryEntry,
  computeEntityRegistryName,
  getExtendedEntityRegistryEntry,
} from "../../../data/entity_registry";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { VoiceSettingsDialogParams } from "./show-dialog-voice-settings";
import "./entity-voice-settings";
import { createCloseHeading } from "../../../components/ha-dialog";

@customElement("dialog-voice-settings")
class DialogVoiceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _extEntityReg?: ExtEntityRegistryEntry;

  public async showDialog(params: VoiceSettingsDialogParams): Promise<void> {
    this._extEntityReg = await getExtendedEntityRegistryEntry(
      this.hass,
      params.entityId
    );
  }

  public closeDialog(): void {
    this._extEntityReg = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._extEntityReg) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          computeEntityRegistryName(this.hass, this._extEntityReg) ||
            "Unnamed entity"
        )}
      >
        <div>
          <entity-voice-settings
            .hass=${this.hass}
            .entry=${this._extEntityReg}
            @entity-entry-updated=${this._entityEntryUpdated}
          ></entity-voice-settings>
        </div>
      </ha-dialog>
    `;
  }

  private _entityEntryUpdated(ev: CustomEvent) {
    this._extEntityReg = ev.detail;
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
