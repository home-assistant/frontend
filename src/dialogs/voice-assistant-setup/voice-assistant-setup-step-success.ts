import { mdiCog, mdiMicrophone, mdiPlay } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
} from "../../common/entity/compute_device_name";
import "../../components/ha-list-item";
import "../../components/ha-select";
import "../../components/ha-tts-voice-picker";
import type { AssistPipeline } from "../../data/assist_pipeline";
import {
  listAssistPipelines,
  updateAssistPipeline,
} from "../../data/assist_pipeline";
import type { AssistSatelliteConfiguration } from "../../data/assist_satellite";
import {
  assistSatelliteAnnounce,
  setWakeWords,
} from "../../data/assist_satellite";
import { fetchCloudStatus } from "../../data/cloud";
import { updateDeviceRegistryEntry } from "../../data/device_registry";
import type { InputSelectEntity } from "../../data/input_select";
import { setSelectOption } from "../../data/select";
import { showVoiceAssistantPipelineDetailDialog } from "../../panels/config/voice-assistants/show-dialog-voice-assistant-pipeline-detail";
import "../../panels/lovelace/entity-rows/hui-select-entity-row";
import type { HomeAssistant } from "../../types";
import { getTranslation } from "../../util/common-translation";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";

@customElement("ha-voice-assistant-setup-step-success")
export class HaVoiceAssistantSetupStepSuccess extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property({ attribute: false }) public deviceId!: string;

  @property({ attribute: false }) public assistEntityId?: string;

  @state() private _ttsSettings?: any;

  @state() private _error?: string;

  private _deviceName?: string;

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("assistConfiguration")) {
      this._setTtsSettings();
      return;
    }
    if (changedProperties.has("hass") && this.assistConfiguration) {
      const oldHass = changedProperties.get("hass") as this["hass"] | undefined;
      if (oldHass) {
        const oldState =
          oldHass.states[this.assistConfiguration.pipeline_entity_id];
        const newState =
          this.hass.states[this.assistConfiguration.pipeline_entity_id];
        if (oldState.state !== newState.state) {
          this._setTtsSettings();
        }
      }
    }
  }

  protected override render() {
    const pipelineEntity = this.assistConfiguration
      ? (this.hass.states[
          this.assistConfiguration.pipeline_entity_id
        ] as InputSelectEntity)
      : undefined;

    const device = this.hass.devices[this.deviceId];

    return html`<div class="content">
        <img
          src="/static/images/voice-assistant/heart.png"
          alt="Casita Home Assistant logo"
        />
        <h1>
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.success.title"
          )}
        </h1>
        <p class="secondary">
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.success.secondary"
          )}
        </p>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <div class="rows">
          <div class="row">
            <ha-textfield
              .label=${this.hass.localize(
                "ui.panel.config.integrations.config_flow.device_name"
              )}
              .placeholder=${computeDeviceNameDisplay(device, this.hass)}
              .value=${this._deviceName ?? computeDeviceName(device)}
              @change=${this._deviceNameChanged}
            ></ha-textfield>
          </div>
          ${this.assistConfiguration &&
          this.assistConfiguration.available_wake_words.length > 1
            ? html`<div class="row">
                <ha-select
                  .label=${"Wake word"}
                  @closed=${stopPropagation}
                  fixedMenuPosition
                  naturalMenuWidth
                  .value=${this.assistConfiguration.active_wake_words[0]}
                  @selected=${this._wakeWordPicked}
                >
                  ${this.assistConfiguration.available_wake_words.map(
                    (wakeword) =>
                      html`<ha-list-item .value=${wakeword.id}>
                        ${wakeword.wake_word}
                      </ha-list-item>`
                  )}
                </ha-select>
                <ha-button
                  appearance="plain"
                  size="small"
                  @click=${this._testWakeWord}
                >
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiMicrophone}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.voice_assistants.satellite_wizard.success.test_wakeword"
                  )}
                </ha-button>
              </div>`
            : nothing}
          ${pipelineEntity
            ? html`<div class="row">
                <ha-select
                  .label=${"Assistant"}
                  @closed=${stopPropagation}
                  .value=${pipelineEntity?.state}
                  fixedMenuPosition
                  naturalMenuWidth
                  @selected=${this._pipelinePicked}
                >
                  ${pipelineEntity?.attributes.options.map(
                    (pipeline) =>
                      html`<ha-list-item .value=${pipeline}>
                        ${this.hass.formatEntityState(pipelineEntity, pipeline)}
                      </ha-list-item>`
                  )}
                </ha-select>
                <ha-button
                  appearance="plain"
                  size="small"
                  @click=${this._openPipeline}
                >
                  <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.voice_assistants.satellite_wizard.success.edit_pipeline"
                  )}
                </ha-button>
              </div>`
            : nothing}
          ${this._ttsSettings
            ? html`<div class="row">
                <ha-tts-voice-picker
                  .hass=${this.hass}
                  .engineId=${this._ttsSettings.engine}
                  .language=${this._ttsSettings.language}
                  .value=${this._ttsSettings.voice}
                  @value-changed=${this._voicePicked}
                  @closed=${stopPropagation}
                ></ha-tts-voice-picker>
                <ha-button
                  appearance="plain"
                  size="small"
                  @click=${this._testTts}
                >
                  <ha-svg-icon slot="start" .path=${mdiPlay}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.voice_assistants.satellite_wizard.success.try_tts"
                  )}
                </ha-button>
              </div>`
            : nothing}
        </div>
      </div>
      <div class="footer">
        <ha-button @click=${this._done}
          >${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.success.done"
          )}</ha-button
        >
      </div>`;
  }

  private async _getPipeline(): Promise<
    [AssistPipeline | undefined, string | undefined | null]
  > {
    if (!this.assistConfiguration?.pipeline_entity_id) {
      return [undefined, undefined];
    }

    const pipelineName =
      this.hass.states[this.assistConfiguration?.pipeline_entity_id].state;

    const pipelines = await listAssistPipelines(this.hass);

    let pipeline: AssistPipeline | undefined;

    if (pipelineName === "preferred") {
      pipeline = pipelines.pipelines.find(
        (ppln) => ppln.id === pipelines.preferred_pipeline
      );
    } else {
      pipeline = pipelines.pipelines.find((ppln) => ppln.name === pipelineName);
    }
    return [pipeline, pipelines.preferred_pipeline];
  }

  private _deviceNameChanged(ev) {
    this._deviceName = ev.target.value;
  }

  private async _wakeWordPicked(ev) {
    const option = ev.target.value;
    await setWakeWords(this.hass, this.assistEntityId!, [option]);
  }

  private _pipelinePicked(ev) {
    const stateObj = this.hass!.states[
      this.assistConfiguration!.pipeline_entity_id
    ] as InputSelectEntity;
    const option = ev.target.value;
    if (
      option === stateObj.state ||
      !stateObj.attributes.options.includes(option)
    ) {
      return;
    }
    setSelectOption(this.hass!, stateObj.entity_id, option);
  }

  private async _setTtsSettings() {
    const [pipeline] = await this._getPipeline();
    if (!pipeline) {
      this._ttsSettings = undefined;
      return;
    }
    this._ttsSettings = {
      engine: pipeline.tts_engine,
      voice: pipeline.tts_voice,
      language: pipeline.tts_language,
    };
  }

  private async _voicePicked(ev) {
    const [pipeline] = await this._getPipeline();

    if (!pipeline) {
      return;
    }

    await updateAssistPipeline(this.hass, pipeline.id, {
      ...pipeline,
      tts_voice: ev.detail.value,
    });
  }

  private async _testTts() {
    const [pipeline] = await this._getPipeline();

    if (!pipeline) {
      return;
    }

    if (pipeline.language !== this.hass.locale.language) {
      try {
        const result = await getTranslation(null, pipeline.language, false);
        this._announce(result.data["ui.dialogs.tts-try.message_example"]);
        return;
      } catch (_e) {
        // ignore fallback to user language
      }
    }

    this._announce(this.hass.localize("ui.dialogs.tts-try.message_example"));
  }

  private async _announce(message: string) {
    if (!this.assistEntityId) {
      return;
    }
    await assistSatelliteAnnounce(this.hass, this.assistEntityId, {
      message,
      preannounce: false,
    });
  }

  private _testWakeWord() {
    fireEvent(this, "next-step", {
      step: STEP.WAKEWORD,
      nextStep: STEP.SUCCESS,
      updateConfig: true,
    });
  }

  private async _openPipeline() {
    const [pipeline] = await this._getPipeline();

    if (!pipeline) {
      return;
    }

    const cloudStatus = await fetchCloudStatus(this.hass);

    showVoiceAssistantPipelineDetailDialog(this, {
      cloudActiveSubscription:
        cloudStatus.logged_in && cloudStatus.active_subscription,
      pipeline,
      updatePipeline: async (values) => {
        await updateAssistPipeline(this.hass!, pipeline!.id, values);
      },
      hideWakeWord: true,
    });
  }

  private async _done() {
    if (this._deviceName) {
      try {
        updateDeviceRegistryEntry(this.hass, this.deviceId, {
          name_by_user: this._deviceName,
        });
      } catch (error: any) {
        this._error = this.hass.localize(
          "ui.panel.config.voice_assistants.satellite_wizard.success.failed_rename",
          { error: error.message || error }
        );
        return;
      }
    }
    fireEvent(this, "closed");
  }

  static styles = [
    AssistantSetupStyles,
    css`
      ha-md-list-item {
        text-align: initial;
      }
      ha-tts-voice-picker {
        display: block;
      }
      .footer {
        margin-top: 24px;
      }
      .rows {
        gap: 16px;
        display: flex;
        flex-direction: column;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .row > *:first-child {
        flex: 1;
        margin-right: 4px;
      }
      .row ha-button {
        width: 82px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-success": HaVoiceAssistantSetupStepSuccess;
  }
}
