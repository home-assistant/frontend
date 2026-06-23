import { mdiChevronLeft, mdiTuneVertical } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-icon-button";
import "../../../components/ha-dialog";
import type { ExposeEntitySettings } from "../../../data/expose";
import { voiceAssistants } from "../../../data/expose";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import {
  haStyle,
  haStyleDialog,
  haStyleDialogFixedTop,
} from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./entity-voice-settings";
import "./voice-assistant-settings";
import type { VoiceSettingsDialogParams } from "./show-dialog-voice-settings";

@customElement("dialog-voice-settings")
class DialogVoiceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: VoiceSettingsDialogParams;

  @state() private _open = false;

  @state() private _editingAssistant?: string;

  @state() private _exposed?: ExposeEntitySettings;

  public showDialog(params: VoiceSettingsDialogParams): void {
    this._params = params;
    this._exposed = params.exposed;
    this._editingAssistant = undefined;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._exposed = undefined;
    this._editingAssistant = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _viewMoreInfo(): void {
    showMoreInfoDialog(this, {
      entityId: this._params!.entityId,
    });
    this.closeDialog();
  }

  private _editAssistant(ev: CustomEvent): void {
    this._editingAssistant = ev.detail.assistant;
  }

  private _backToList(): void {
    this._editingAssistant = undefined;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const title = this._editingAssistant
      ? voiceAssistants[this._editingAssistant].name
      : computeStateName(this.hass.states[this._params.entityId]) ||
        this.hass.localize("ui.panel.config.entities.picker.unnamed_entity");

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${title}
        @closed=${this._dialogClosed}
      >
        ${this._editingAssistant
          ? html`<ha-icon-button
              slot="headerNavigationIcon"
              .label=${this.hass.localize("ui.common.back")}
              .path=${mdiChevronLeft}
              @click=${this._backToList}
            ></ha-icon-button>`
          : html`<ha-icon-button
              slot="headerActionItems"
              .label=${this.hass.localize(
                "ui.dialogs.voice-settings.view_entity"
              )}
              .path=${mdiTuneVertical}
              @click=${this._viewMoreInfo}
            ></ha-icon-button>`}
        <div>${this._renderContent()}</div>
      </ha-dialog>
    `;
  }

  private _renderContent() {
    const entityId = this._params!.entityId;

    if (this._editingAssistant) {
      return html`<voice-assistant-settings
        .hass=${this.hass}
        .entityId=${entityId}
        .assistant=${this._editingAssistant}
        .entry=${this._params!.extEntityReg}
        @entity-entry-updated=${this._entityEntryUpdated}
      ></voice-assistant-settings>`;
    }

    return html`<entity-voice-settings
      .hass=${this.hass}
      .entityId=${entityId}
      .entry=${this._params!.extEntityReg}
      .exposed=${this._exposed!}
      @edit-assistant=${this._editAssistant}
      @exposed-changed=${this._exposedChanged}
      @entity-entry-updated=${this._entityEntryUpdated}
      @exposed-entities-changed=${this._exposedEntitiesChanged}
    ></entity-voice-settings>`;
  }

  private _exposedChanged(ev: CustomEvent): void {
    this._exposed = ev.detail.value;
  }

  private _entityEntryUpdated(ev: CustomEvent) {
    this._params!.extEntityReg = ev.detail;
    this._params!.entityEntryUpdated?.(ev.detail);
  }

  private _exposedEntitiesChanged() {
    this._params!.exposedEntitiesChanged?.();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      haStyleDialogFixedTop,
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
