import { mdiCog, mdiMicrophone, mdiPlay } from "@mdi/js";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../../components/ha-select";
import "../../components/ha-tts-voice-picker";
import {
  AssistPipeline,
  listAssistPipelines,
  setAssistPipelinePreferred,
  updateAssistPipeline,
} from "../../data/assist_pipeline";
import {
  assistSatelliteAnnounce,
  AssistSatelliteConfiguration,
  setWakeWords,
} from "../../data/assist_satellite";
import { fetchCloudStatus } from "../../data/cloud";
import { showVoiceAssistantPipelineDetailDialog } from "../../panels/config/voice-assistants/show-dialog-voice-assistant-pipeline-detail";
import "../../panels/lovelace/entity-rows/hui-select-entity-row";
import { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";
import { setSelectOption } from "../../data/select";
import { InputSelectEntity } from "../../data/input_select";

@customElement("ha-voice-assistant-setup-step-success")
export class HaVoiceAssistantSetupStepSuccess extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property() public deviceId!: string;

  @property() public assistEntityId?: string;

  @state() private _ttsSettings?: any;

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

    return html`<div class="content">
        <img src="/static/images/voice-assistant/heart.gif" />
        <h1>Ready to Assist!</h1>
        <p class="secondary">
          Make any final customizations here. You can always change these in the
          Voice Assistants section of the settings page.
        </p>
        <div class="rows">
          ${this.assistConfiguration &&
          this.assistConfiguration.available_wake_words.length > 1
            ? html` <div class="row">
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
                <ha-button @click=${this._testWakeWord}>
                  <ha-svg-icon slot="icon" .path=${mdiMicrophone}></ha-svg-icon>
                  Test
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
                <ha-button @click=${this._openPipeline}>
                  <ha-svg-icon slot="icon" .path=${mdiCog}></ha-svg-icon>
                  Edit
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
                <ha-button @click=${this._testTts}>
                  <ha-svg-icon slot="icon" .path=${mdiPlay}></ha-svg-icon>
                  Try
                </ha-button>
              </div>`
            : nothing}
        </div>
      </div>
      <div class="footer">
        <ha-button @click=${this._close} unelevated>Done</ha-button>
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

  private _testTts() {
    this._announce("Hello, how can I help you?");
  }

  private async _announce(message: string) {
    if (!this.assistEntityId) {
      return;
    }
    await assistSatelliteAnnounce(this.hass, this.assistEntityId, message);
  }

  private _testWakeWord() {
    fireEvent(this, "next-step", {
      step: STEP.WAKEWORD,
      nextStep: STEP.SUCCESS,
      updateConfig: true,
    });
  }

  private async _openPipeline() {
    const [pipeline, preferred_pipeline] = await this._getPipeline();

    if (!pipeline) {
      return;
    }

    const cloudStatus = await fetchCloudStatus(this.hass);

    showVoiceAssistantPipelineDetailDialog(this, {
      cloudActiveSubscription:
        cloudStatus.logged_in && cloudStatus.active_subscription,
      pipeline,
      preferred: pipeline.id === preferred_pipeline,
      updatePipeline: async (values) => {
        await updateAssistPipeline(this.hass!, pipeline!.id, values);
      },
      setPipelinePreferred: async () => {
        await setAssistPipelinePreferred(this.hass!, pipeline!.id);
      },
      hideWakeWord: true,
    });
  }

  private _close() {
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
