import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import "../../../components/ha-textfield";
import { getEntityRecordingSettings } from "../../../data/recorder";
import { handleRecordingChange } from "./recorder-util";
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
      // eslint-disable-next-line no-console
      console.error("Error fetching recording settings:", err);
    }
  }

  protected render() {
    const stateObj = this.hass.states[this.entityId];
    const name = stateObj?.attributes?.friendly_name || this.entityId;

    return html`
      <ha-textfield
        .label=${this.hass.localize("ui.dialogs.entity_registry.editor.name")}
        .value=${name}
        disabled
        readonly
      ></ha-textfield>
      <ha-textfield
        .label=${this.hass.localize(
          "ui.dialogs.entity_registry.editor.entity_id"
        )}
        .value=${this.entityId}
        disabled
        readonly
      ></ha-textfield>
      ${isComponentLoaded(this.hass, "recorder")
        ? html`
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
                .checked=${this._recordingDisabled !== true}
                @change=${this._recordingChanged}
              ></ha-switch>
            </ha-settings-row>
          `
        : nothing}
    `;
  }

  private async _recordingChanged(ev: CustomEvent): Promise<void> {
    const checkbox = ev.currentTarget as HaSwitch;

    await handleRecordingChange({
      hass: this.hass,
      entityId: this.entityId,
      checkbox,
      onSuccess: (recordingDisabled) => {
        this._recordingDisabled = recordingDisabled;
        // Fire event to notify entities table to refresh recording data
        this.dispatchEvent(
          new CustomEvent("entity-recording-updated", {
            detail: { entityId: this.entityId },
            bubbles: true,
            composed: true,
          })
        );
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          margin-top: 16px;
        }
        ha-textfield {
          display: block;
          margin-bottom: 16px;
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
