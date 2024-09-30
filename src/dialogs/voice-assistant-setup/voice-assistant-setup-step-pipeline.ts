import { mdiOpenInNew } from "@mdi/js";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import {
  createAssistPipeline,
  listAssistPipelines,
} from "../../data/assist_pipeline";
import { AssistSatelliteConfiguration } from "../../data/assist_satellite";
import { fetchCloudStatus } from "../../data/cloud";
import { listSTTEngines } from "../../data/stt";
import { listTTSEngines, listTTSVoices } from "../../data/tts";
import { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";

@customElement("ha-voice-assistant-setup-step-pipeline")
export class HaVoiceAssistantSetupStepPipeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property() public deviceId!: string;

  @property() public assistEntityId?: string;

  @state() private _showFirst = false;

  @state() private _showSecond = false;

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (!this.hasUpdated) {
      this._checkCloud();
    }
  }

  protected override firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    setTimeout(() => {
      this._showFirst = true;
    }, 1);
    setTimeout(() => {
      this._showSecond = true;
    }, 1500);
  }

  protected override render() {
    return html`<div class="padding content">
        <div class="messages-container">
          <div class="message user ${this._showFirst ? "show" : ""}">
            ${!this._showFirst ? "…" : "Turn on the lights in the bedroom"}
          </div>
          ${this._showFirst
            ? html` <div class="message hass ${this._showSecond ? "show" : ""}">
                ${!this._showSecond ? "…" : "Turned on the lights"}
              </div>`
            : nothing}
        </div>
        <h1>Select system</h1>
        <p class="secondary">
          How quickly your voice assistant responds depends on the power of your
          system.
        </p>
      </div>
      <ha-md-list>
        <ha-md-list-item interactive type="button" @click=${this._setupCloud}>
          Home Assistant Cloud
          <span slot="supporting-text"
            >Ideal if you don't have a powerful system at home</span
          >
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-md-list-item>
        <ha-md-list-item interactive type="button" @click=${this._thisSystem}>
          On this system
          <span slot="supporting-text"
            >Local setup with the Whisper and Piper add-ons</span
          >
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-md-list-item>
        <ha-md-list-item
          interactive
          type="link"
          href=${documentationUrl(
            this.hass,
            "/voice_control/voice_remote_local_assistant/"
          )}
          rel="noreferrer noopenner"
          target="_blank"
          @click=${this._skip}
        >
          Use external system
          <span slot="supporting-text"
            >Learn more about how to host it on another system</span
          >
          <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
        </ha-md-list-item>
      </ha-md-list>`;
  }

  private async _checkCloud() {
    if (!isComponentLoaded(this.hass, "cloud")) {
      return;
    }
    const cloudStatus = await fetchCloudStatus(this.hass);
    if (!cloudStatus.logged_in || !cloudStatus.active_subscription) {
      return;
    }
    let cloudTtsEntityId;
    let cloudSttEntityId;
    for (const entity of Object.values(this.hass.entities)) {
      if (entity.platform === "cloud") {
        const domain = computeDomain(entity.entity_id);
        if (domain === "tts") {
          cloudTtsEntityId = entity.entity_id;
        } else if (domain === "stt") {
          cloudSttEntityId = entity.entity_id;
        } else {
          continue;
        }
        if (cloudTtsEntityId && cloudSttEntityId) {
          break;
        }
      }
    }
    const pipelines = await listAssistPipelines(this.hass);
    const preferredPipeline = pipelines.pipelines.find(
      (pipeline) => pipeline.id === pipelines.preferred_pipeline
    );

    if (preferredPipeline) {
      if (
        preferredPipeline.tts_engine === cloudTtsEntityId &&
        preferredPipeline.stt_engine === cloudSttEntityId
      ) {
        await this.hass.callService(
          "select",
          "select_option",
          { option: "preferred" },
          { entity_id: this.assistConfiguration?.pipeline_entity_id }
        );
        fireEvent(this, "next-step", { step: STEP.SUCCESS, noPrevious: true });
        return;
      }
    }

    let cloudPipeline = pipelines.pipelines.find(
      (pipeline) =>
        pipeline.tts_engine === cloudTtsEntityId &&
        pipeline.stt_engine === cloudSttEntityId
    );

    if (!cloudPipeline) {
      const ttsEngine = (
        await listTTSEngines(
          this.hass,
          this.hass.config.language,
          this.hass.config.country || undefined
        )
      ).providers.find((provider) => provider.engine_id === cloudTtsEntityId);
      const ttsVoices = await listTTSVoices(
        this.hass,
        cloudTtsEntityId,
        ttsEngine?.supported_languages![0] || this.hass.config.language
      );

      const sttEngine = (
        await listSTTEngines(
          this.hass,
          this.hass.config.language,
          this.hass.config.country || undefined
        )
      ).providers.find((provider) => provider.engine_id === cloudSttEntityId);

      let pipelineName = "Home Assistant Cloud";
      let i = 1;
      while (
        pipelines.pipelines.find(
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          (pipeline) => pipeline.name === pipelineName
        )
      ) {
        pipelineName = `${pipelineName} ${i}`;
        i++;
      }

      cloudPipeline = await createAssistPipeline(this.hass, {
        name: pipelineName,
        language: this.hass.config.language,
        conversation_engine: "conversation.home_assistant",
        conversation_language: this.hass.config.language,
        stt_engine: cloudSttEntityId,
        stt_language: sttEngine!.supported_languages![0],
        tts_engine: cloudTtsEntityId,
        tts_language: ttsEngine!.supported_languages![0],
        tts_voice: ttsVoices.voices![0].voice_id,
        wake_word_entity: null,
        wake_word_id: null,
      });
    }

    await this.hass.callService(
      "select",
      "select_option",
      { option: cloudPipeline.name },
      { entity_id: this.assistConfiguration?.pipeline_entity_id }
    );
    fireEvent(this, "next-step", { step: STEP.SUCCESS, noPrevious: true });
  }

  private async _setupCloud() {
    this._nextStep(STEP.CLOUD);
  }

  private async _thisSystem() {
    this._nextStep(STEP.ADDONS);
  }

  private _skip() {
    this._nextStep(STEP.SUCCESS);
  }

  private _nextStep(step?: STEP) {
    fireEvent(this, "next-step", { step });
  }

  static styles = [
    AssistantSetupStyles,
    css`
      :host {
        padding: 0;
      }
      .padding {
        padding: 24px;
      }
      ha-md-list {
        width: 100%;
        text-align: initial;
      }

      .messages-container {
        padding: 24px;
        box-sizing: border-box;
        height: 152px;
      }
      .message {
        white-space: nowrap;
        font-size: 18px;
        clear: both;
        margin: 8px 0;
        padding: 8px;
        border-radius: 15px;
        height: 36px;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: width 1s;
        width: 30px;
      }

      .message.user {
        margin-left: 24px;
        margin-inline-start: 24px;
        margin-inline-end: initial;
        float: var(--float-end);
        text-align: right;
        border-bottom-right-radius: 0px;
        background-color: var(--primary-color);
        color: var(--text-primary-color);
        direction: var(--direction);
      }

      .message.user.show {
        width: 295px;
      }

      .message.hass {
        margin-right: 24px;
        margin-inline-end: 24px;
        margin-inline-start: initial;
        float: var(--float-start);
        border-bottom-left-radius: 0px;
        background-color: var(--secondary-background-color);
        color: var(--primary-text-color);
        direction: var(--direction);
      }

      .message.hass.show {
        width: 184px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-pipeline": HaVoiceAssistantSetupStepPipeline;
  }
}
