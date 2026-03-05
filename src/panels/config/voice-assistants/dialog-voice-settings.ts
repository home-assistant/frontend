import { mdiTuneVertical } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-icon-button";
import "../../../components/ha-wa-dialog";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./entity-voice-settings";
import type { VoiceSettingsDialogParams } from "./show-dialog-voice-settings";

@customElement("dialog-voice-settings")
class DialogVoiceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: VoiceSettingsDialogParams;

  @state() private _open = false;

  public showDialog(params: VoiceSettingsDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _viewMoreInfo(): void {
    showMoreInfoDialog(this, {
      entityId: this._params!.entityId,
    });
    this.closeDialog();
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const title =
      computeStateName(this.hass.states[this._params.entityId]) ||
      this.hass.localize("ui.panel.config.entities.picker.unnamed_entity");

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${title}
        @closed=${this._dialogClosed}
      >
        <ha-icon-button
          slot="headerActionItems"
          .label=${this.hass.localize("ui.dialogs.voice-settings.view_entity")}
          .path=${mdiTuneVertical}
          @click=${this._viewMoreInfo}
        ></ha-icon-button>
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
      </ha-wa-dialog>
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
        ha-wa-dialog {
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
