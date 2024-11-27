import { mdiOpenInNew } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import "../../components/ha-circular-progress";
import {
  createAssistPipeline,
  listAssistPipelines,
} from "../../data/assist_pipeline";
import type { AssistSatelliteConfiguration } from "../../data/assist_satellite";
import { createConfigFlow, handleConfigFlowStep } from "../../data/config_flow";
import type { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import {
  fetchHassioAddonsInfo,
  installHassioAddon,
  startHassioAddon,
} from "../../data/hassio/addon";
import { listSTTEngines } from "../../data/stt";
import { listTTSEngines, listTTSVoices } from "../../data/tts";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";

@customElement("ha-voice-assistant-setup-step-local")
export class HaVoiceAssistantSetupStepLocal extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @state() private _state: "INSTALLING" | "NOT_SUPPORTED" | "ERROR" | "INTRO" =
    "INTRO";

  @state() private _detailState?: string;

  @state() private _localTts?: EntityRegistryDisplayEntry[];

  @state() private _localStt?: EntityRegistryDisplayEntry[];

  protected override render() {
    return html`<div class="content">
      ${this._state === "INSTALLING"
        ? html`<img src="/static/images/voice-assistant/update.png" />
            <h1>Installing add-ons</h1>
            <p>
              The Whisper and Piper add-ons are being installed and configured.
            </p>
            <ha-circular-progress indeterminate></ha-circular-progress>
            <p>
              ${this._detailState || "Installation can take several minutes"}
            </p>`
        : this._state === "ERROR"
          ? html` <img src="/static/images/voice-assistant/error.png" />
              <h1>Failed to install add-ons</h1>
              <p>
                We could not automatically install a local TTS and STT provider
                for you. Read the documentation to learn how to install them.
              </p>

              <a
                href=${documentationUrl(
                  this.hass,
                  "/voice_control/voice_remote_local_assistant/"
                )}
                target="_blank"
                rel="noreferrer noopenner"
              >
                <ha-button @click=${this._skip}>
                  <ha-svg-icon .path=${mdiOpenInNew} slot="icon"></ha-svg-icon>
                  Learn more</ha-button
                >
              </a>`
          : this._state === "NOT_SUPPORTED"
            ? html`<img src="/static/images/voice-assistant/error.png" />
                <h1>Installation of add-ons is not supported on your system</h1>
                <p>
                  Your system is not supported to automatically install a local
                  TTS and STT provider. Learn how to set up local TTS and STT
                  providers in the documentation.
                </p>
                <a
                  href=${documentationUrl(
                    this.hass,
                    "/voice_control/voice_remote_local_assistant/"
                  )}
                  target="_blank"
                  rel="noreferrer noopenner"
                >
                  <ha-button @click=${this._skip}>
                    <ha-svg-icon
                      .path=${mdiOpenInNew}
                      slot="icon"
                    ></ha-svg-icon>
                    Learn more</ha-button
                  > </a
                >.`
            : nothing}
    </div>`;
  }

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (!this.hasUpdated) {
      this._checkLocal();
    }
  }

  private _skip() {
    fireEvent(this, "next-step", { step: STEP.SUCCESS });
  }

  private async _checkLocal() {
    this._findLocalEntities();
    if (!this._localTts || !this._localStt) {
      return;
    }
    if (this._localTts.length && this._localStt.length) {
      this._pickOrCreatePipelineExists();
    }
    if (!isComponentLoaded(this.hass, "hassio")) {
      this._state = "NOT_SUPPORTED";
      return;
    }
    this._state = "INSTALLING";
    try {
      const { addons } = await fetchHassioAddonsInfo(this.hass);
      const whisper = addons.find((addon) => addon.slug === "core_whisper");
      const piper = addons.find((addon) => addon.slug === "core_piper");
      if (piper && !this._localTts.length) {
        if (piper.state !== "started") {
          this._detailState = "Starting Piper add-on";
          await startHassioAddon(this.hass, "core_piper");
        }
        this._detailState = "Setting up Piper";
        await this._setupConfigEntry("piper");
      }
      if (whisper && !this._localStt.length) {
        if (whisper.state !== "started") {
          this._detailState = "Starting Whisper add-on";
          await startHassioAddon(this.hass, "core_whisper");
        }
        this._detailState = "Setting up Whisper";
        await this._setupConfigEntry("whisper");
      }
      if (!piper) {
        this._detailState = "Installing Piper add-on";
        await installHassioAddon(this.hass, "core_piper");
        this._detailState = "Starting Piper add-on";
        await startHassioAddon(this.hass, "core_piper");
        this._detailState = "Setting up Piper";
        await this._setupConfigEntry("piper");
      }
      if (!whisper) {
        this._detailState = "Installing Whisper add-on";
        await installHassioAddon(this.hass, "core_whisper");
        this._detailState = "Starting Whisper add-on";
        await startHassioAddon(this.hass, "core_whisper");
        this._detailState = "Setting up Whisper";
        await this._setupConfigEntry("whisper");
      }
      this._detailState = "Creating assistant";
      this._findEntitiesAndCreatePipeline();
    } catch (e) {
      this._state = "ERROR";
    }
  }

  private _findLocalEntities() {
    const wyomingEntities = Object.values(this.hass.entities).filter(
      (entity) => entity.platform === "wyoming"
    );
    this._localTts = wyomingEntities.filter(
      (ent) => computeDomain(ent.entity_id) === "tts"
    );
    this._localStt = wyomingEntities.filter(
      (ent) => computeDomain(ent.entity_id) === "stt"
    );
  }

  private async _setupConfigEntry(addon: string) {
    const configFlow = await createConfigFlow(this.hass, "wyoming");
    const step = await handleConfigFlowStep(this.hass, configFlow.flow_id, {
      host: `core_${addon}`,
      port: addon === "piper" ? 10200 : 10300,
    });
    if (step.type !== "create_entry") {
      throw new Error("Failed to create entry");
    }
  }

  private async _pickOrCreatePipelineExists() {
    // Check if a pipeline already exists with local TTS and STT

    if (!this._localStt?.length || !this._localTts?.length) {
      return;
    }

    const pipelines = await listAssistPipelines(this.hass);
    const preferredPipeline = pipelines.pipelines.find(
      (pipeline) => pipeline.id === pipelines.preferred_pipeline
    );

    const ttsEntityIds = this._localTts.map((ent) => ent.entity_id);
    const sttEntityIds = this._localStt.map((ent) => ent.entity_id);

    if (preferredPipeline) {
      if (
        preferredPipeline.tts_engine &&
        ttsEntityIds.includes(preferredPipeline.tts_engine) &&
        preferredPipeline.stt_engine &&
        sttEntityIds.includes(preferredPipeline.stt_engine)
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

    let localPipeline = pipelines.pipelines.find(
      (pipeline) =>
        pipeline.tts_engine &&
        ttsEntityIds.includes(pipeline.tts_engine) &&
        pipeline.stt_engine &&
        sttEntityIds.includes(pipeline.stt_engine)
    );

    if (!localPipeline) {
      localPipeline = await this._createPipeline(
        this._localTts[0].entity_id,
        this._localStt[0].entity_id
      );
    }

    await this.hass.callService(
      "select",
      "select_option",
      { option: localPipeline.name },
      { entity_id: this.assistConfiguration?.pipeline_entity_id }
    );
    fireEvent(this, "next-step", { step: STEP.SUCCESS, noPrevious: true });
  }

  private async _createPipeline(ttsEntityId: string, sttEntityId: string) {
    // Create a pipeline with local TTS and STT

    const pipelines = await listAssistPipelines(this.hass);

    const ttsEngine = (
      await listTTSEngines(
        this.hass,
        this.hass.config.language,
        this.hass.config.country || undefined
      )
    ).providers.find((provider) => provider.engine_id === ttsEntityId);
    const ttsVoices = await listTTSVoices(
      this.hass,
      ttsEntityId,
      ttsEngine?.supported_languages![0] || this.hass.config.language
    );

    const sttEngine = (
      await listSTTEngines(
        this.hass,
        this.hass.config.language,
        this.hass.config.country || undefined
      )
    ).providers.find((provider) => provider.engine_id === sttEntityId);

    let pipelineName = "Local Assistant";
    let i = 1;
    while (
      pipelines.pipelines.find(
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        (pipeline) => pipeline.name === pipelineName
      )
    ) {
      pipelineName = `Local Assistant ${i}`;
      i++;
    }

    return createAssistPipeline(this.hass, {
      name: pipelineName,
      language: this.hass.config.language.split("-")[0],
      conversation_engine: "conversation.home_assistant",
      conversation_language: this.hass.config.language.split("-")[0],
      stt_engine: sttEntityId,
      stt_language: sttEngine!.supported_languages![0],
      tts_engine: ttsEntityId,
      tts_language: ttsEngine!.supported_languages![0],
      tts_voice: ttsVoices.voices![0].voice_id,
      wake_word_entity: null,
      wake_word_id: null,
    });
  }

  private async _findEntitiesAndCreatePipeline(tryNo: number = 0) {
    this._findLocalEntities();
    if (!this._localTts?.length || !this._localStt?.length) {
      if (tryNo > 3) {
        throw new Error("Timeout searching for local TTS and STT entities");
      }
      setTimeout(() => this._findEntitiesAndCreatePipeline(tryNo + 1), 2000);
      return;
    }

    const localPipeline = await this._createPipeline(
      this._localTts[0].entity_id,
      this._localStt[0].entity_id
    );

    await this.hass.callService(
      "select",
      "select_option",
      { option: localPipeline.name },
      { entity_id: this.assistConfiguration?.pipeline_entity_id }
    );
    fireEvent(this, "next-step", { step: STEP.SUCCESS, noPrevious: true });
  }

  static styles = [
    AssistantSetupStyles,
    css`
      ha-circular-progress {
        margin-top: 24px;
        margin-bottom: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-local": HaVoiceAssistantSetupStepLocal;
  }
}
