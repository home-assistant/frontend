import "@material/mwc-button/mwc-button";
import { mdiClose, mdiTuneVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-dialog-header";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
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
      <ha-dialog open @closed=${this.closeDialog} hideActions .heading=${title}>
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title" .title=${title}>${title}</span>
          <ha-icon-button
            slot="actionItems"
            .label=${this.hass.localize(
              "ui.dialogs.voice-settings.view_entity"
            )}
            .path=${mdiTuneVertical}
            @click=${this._viewMoreInfo}
          ></ha-icon-button>
        </ha-dialog-header>
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
