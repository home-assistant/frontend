import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import {
  getEntityRecordingSettings,
  setEntityRecordingOptions,
} from "../../../data/recorder";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("entity-settings-without-unique-id")
export class EntitySettingsWithoutUniqueId extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "entity-id" }) public entityId!: string;

  @state() private _recordingDisabled?: boolean;

  protected firstUpdated() {
    this._fetchRecordingSettings();
  }

  private async _fetchRecordingSettings() {
    if (!isComponentLoaded(this.hass, "recorder")) {
      return;
    }
    try {
      const settings = await getEntityRecordingSettings(
        this.hass,
        this.entityId
      );
      this._recordingDisabled = settings?.recording_disabled_by !== null;
    } catch (err: any) {
      // If it's a "not found" error, that's expected for entities that have never been configured
      if (err.code === "not_found") {
        this._recordingDisabled = false;
      } else {
        // For other errors, show an alert
        showAlertDialog(this, { 
          title: this.hass.localize("ui.dialogs.entity_registry.editor.error_loading_recording_settings"),
          text: err.message 
        });
        this._recordingDisabled = false;
      }
    }
  }

  protected render() {
    if (!isComponentLoaded(this.hass, "recorder")) {
      return nothing;
    }

    return html`
      <ha-settings-row>
        <span slot="heading"
          >${this.hass.localize(
            "ui.dialogs.entity_registry.editor.record_label"
          )}</span
        >
        <span slot="description"
          >${this.hass.localize(
            "ui.dialogs.entity_registry.editor.record_description"
          )}</span
        >
        <ha-switch
          .checked=${!this._recordingDisabled}
          @change=${this._recordingChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _recordingChanged(ev: CustomEvent): void {
    const checkbox = ev.currentTarget as HaSwitch;
    const newRecordingDisabled = !checkbox.checked;

    try {
      await setEntityRecordingOptions(
        this.hass,
        [this.entityId],
        newRecordingDisabled ? "user" : null
      );
      this._recordingDisabled = newRecordingDisabled;
    } catch (err: any) {
      showAlertDialog(this, { text: err.message });
      checkbox.checked = !checkbox.checked;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          margin-top: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-settings-without-unique-id": EntitySettingsWithoutUniqueId;
  }
}
