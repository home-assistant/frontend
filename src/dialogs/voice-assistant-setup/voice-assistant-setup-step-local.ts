import { mdiOpenInNew } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import "../../components/ha-spinner";
import {
  createAssistPipeline,
  listAssistPipelines,
} from "../../data/assist_pipeline";
import type { AssistSatelliteConfiguration } from "../../data/assist_satellite";
import {
  createConfigFlow,
  fetchConfigFlowInProgress,
  handleConfigFlowStep,
} from "../../data/config_flow";
import {
  type ExtEntityRegistryEntry,
  getExtendedEntityRegistryEntries,
} from "../../data/entity_registry";
import {
  fetchHassioAddonsInfo,
  installHassioAddon,
  startHassioAddon,
} from "../../data/hassio/addon";
import { listSTTEngines } from "../../data/stt";
import { listTTSEngines, listTTSVoices } from "../../data/tts";
import { fetchWyomingInfo } from "../../data/wyoming";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";
import { listAgents } from "../../data/conversation";

@customElement("ha-voice-assistant-setup-step-local")
export class HaVoiceAssistantSetupStepLocal extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property({ attribute: false }) public localOption!:
    | "focused_local"
    | "full_local";

  @property({ attribute: false }) public language!: string;

  @state() private _state: "INSTALLING" | "NOT_SUPPORTED" | "ERROR" | "INTRO" =
    "INTRO";

  @state() private _detailState?: string;

  @state() private _error?: string;

  @state() private _localTts?: ExtEntityRegistryEntry[];

  @state() private _localStt?: ExtEntityRegistryEntry[];

  protected override render() {
    return html`<div class="content">
      ${this._state === "INSTALLING"
        ? html`<img
              src="/static/images/voice-assistant/update.png"
              alt="Casita Home Assistant loading logo"
            />
            <h1>
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.satellite_wizard.local.title"
              )}
            </h1>
            <p>
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.satellite_wizard.local.secondary"
              )}
            </p>
            <ha-spinner></ha-spinner>
            <p>
              ${this._detailState || "Installation can take several minutes"}
            </p>`
        : this._state === "ERROR"
          ? html`<img
                src="/static/images/voice-assistant/error.png"
                alt="Casita Home Assistant error logo"
              />
              <h1>
                ${this.hass.localize(
                  "ui.panel.config.voice_assistants.satellite_wizard.local.failed_title"
                )}
              </h1>
              <p>${this._error}</p>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.voice_assistants.satellite_wizard.local.failed_secondary"
                )}
              </p>
              <ha-button
                appearance="plain"
                size="small"
                @click=${this._prevStep}
                >${this.hass.localize("ui.common.back")}</ha-button
              >
              <ha-button
                href=${documentationUrl(
                  this.hass,
                  "/voice_control/voice_remote_local_assistant/"
                )}
                target="_blank"
                rel="noreferrer noopener"
                size="small"
                appearance="plain"
              >
                <ha-svg-icon .path=${mdiOpenInNew} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.common.learn_more"
                )}</ha-button
              >`
          : this._state === "NOT_SUPPORTED"
            ? html`<img
                  src="/static/images/voice-assistant/error.png"
                  alt="Casita Home Assistant error logo"
                />
                <h1>
                  ${this.hass.localize(
                    "ui.panel.config.voice_assistants.satellite_wizard.local.not_supported_title"
                  )}
                </h1>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.voice_assistants.satellite_wizard.local.not_supported_secondary"
                  )}
                </p>
                <ha-button
                  appearance="plain"
                  size="small"
                  @click=${this._prevStep}
                  >${this.hass.localize("ui.common.back")}</ha-button
                >
                <ha-button
                  href=${documentationUrl(
                    this.hass,
                    "/voice_control/voice_remote_local_assistant/"
                  )}
                  target="_blank"
                  rel="noreferrer noopener"
                  appearance="plain"
                  size="small"
                >
                  <ha-svg-icon .path=${mdiOpenInNew} slot="start"></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.common.learn_more"
                  )}</ha-button
                >`
            : nothing}
    </div>`;
  }

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (!this.hasUpdated) {
      this._checkLocal();
    }
  }

  private _prevStep() {
    fireEvent(this, "prev-step");
  }

  private _nextStep() {
    fireEvent(this, "next-step", { step: STEP.SUCCESS, noPrevious: true });
  }

  private async _checkLocal() {
    await this._findLocalEntities();
    if (!this._localTts || !this._localStt) {
      return;
    }
    try {
      if (this._localTts.length && this._localStt.length) {
        await this._pickOrCreatePipelineExists();
        return;
      }
      if (!isComponentLoaded(this.hass, "hassio")) {
        this._state = "NOT_SUPPORTED";
        return;
      }
      this._state = "INSTALLING";
      const { addons } = await fetchHassioAddonsInfo(this.hass);
      const ttsAddon = addons.find(
        (addon) => addon.slug === this._ttsAddonName
      );
      const sttAddon = addons.find(
        (addon) => addon.slug === this._sttAddonName
      );
      if (!this._localTts.length) {
        if (!ttsAddon) {
          this._detailState = this.hass.localize(
            `ui.panel.config.voice_assistants.satellite_wizard.local.state.installing_${this._ttsProviderName}`
          );
          await installHassioAddon(this.hass, this._ttsAddonName);
        }
        if (!ttsAddon || ttsAddon.state !== "started") {
          this._detailState = this.hass.localize(
            `ui.panel.config.voice_assistants.satellite_wizard.local.state.starting_${this._ttsProviderName}`
          );
          await startHassioAddon(this.hass, this._ttsAddonName);
        }
        this._detailState = this.hass.localize(
          `ui.panel.config.voice_assistants.satellite_wizard.local.state.setup_${this._ttsProviderName}`
        );
        await this._setupConfigEntry("tts");
      }
      if (!this._localStt.length) {
        if (!sttAddon) {
          this._detailState = this.hass.localize(
            `ui.panel.config.voice_assistants.satellite_wizard.local.state.installing_${this._sttProviderName}`
          );
          await installHassioAddon(this.hass, this._sttAddonName);
        }
        if (!sttAddon || sttAddon.state !== "started") {
          this._detailState = this.hass.localize(
            `ui.panel.config.voice_assistants.satellite_wizard.local.state.starting_${this._sttProviderName}`
          );
          await startHassioAddon(this.hass, this._sttAddonName);
        }
        this._detailState = this.hass.localize(
          `ui.panel.config.voice_assistants.satellite_wizard.local.state.setup_${this._sttProviderName}`
        );
        await this._setupConfigEntry("stt");
      }
      this._detailState = this.hass.localize(
        "ui.panel.config.voice_assistants.satellite_wizard.local.state.creating_pipeline"
      );
      await this._findEntitiesAndCreatePipeline();
    } catch (e: any) {
      this._state = "ERROR";
      this._error = e.message;
    }
  }

  private readonly _ttsProviderName = "piper";

  private readonly _ttsAddonName = "core_piper";

  private readonly _ttsHostName = "core-piper";

  private readonly _ttsPort = 10200;

  private get _sttProviderName() {
    return this.localOption === "focused_local"
      ? "speech-to-phrase"
      : "faster-whisper";
  }

  private get _sttAddonName() {
    return this.localOption === "focused_local"
      ? "core_speech-to-phrase"
      : "core_whisper";
  }

  private get _sttHostName() {
    return this.localOption === "focused_local"
      ? "core-speech-to-phrase"
      : "core-whisper";
  }

  private readonly _sttPort = 10300;

  private async _findLocalEntities() {
    const wyomingEntities = Object.values(this.hass.entities).filter(
      (entity) => entity.platform === "wyoming"
    );
    if (!wyomingEntities.length) {
      this._localStt = [];
      this._localTts = [];
      return;
    }
    const wyomingInfo = await fetchWyomingInfo(this.hass);

    const entityRegs = Object.values(
      await getExtendedEntityRegistryEntries(
        this.hass,
        wyomingEntities.map((ent) => ent.entity_id)
      )
    );

    this._localTts = entityRegs.filter(
      (ent) =>
        computeDomain(ent.entity_id) === "tts" &&
        ent.config_entry_id &&
        wyomingInfo.info[ent.config_entry_id]?.tts.some(
          (provider) => provider.name === this._ttsProviderName
        )
    );
    this._localStt = entityRegs.filter(
      (ent) =>
        computeDomain(ent.entity_id) === "stt" &&
        ent.config_entry_id &&
        wyomingInfo.info[ent.config_entry_id]?.asr.some(
          (provider) => provider.name === this._sttProviderName
        )
    );
  }

  private async _setupConfigEntry(type: "tts" | "stt") {
    const configFlow = await this._findConfigFlowInProgress(type);

    if (configFlow) {
      const step = await handleConfigFlowStep(
        this.hass,
        configFlow.flow_id,
        {}
      );
      if (step.type === "create_entry") {
        return undefined;
      }
    }

    return this._createConfigEntry(type);
  }

  private async _findConfigFlowInProgress(type: "tts" | "stt") {
    const configFlows = await fetchConfigFlowInProgress(this.hass.connection);

    return configFlows.find(
      (flow) =>
        flow.handler === "wyoming" &&
        flow.context.source === "hassio" &&
        ((flow.context.configuration_url &&
          flow.context.configuration_url.includes(
            type === "tts" ? this._ttsAddonName : this._sttAddonName
          )) ||
          (flow.context.title_placeholders.name &&
            flow.context.title_placeholders.name
              .toLowerCase()
              .includes(
                type === "tts" ? this._ttsProviderName : this._sttProviderName
              )))
    );
  }

  private async _createConfigEntry(type: "tts" | "stt") {
    const configFlow = await createConfigFlow(this.hass, "wyoming");
    const step = await handleConfigFlowStep(this.hass, configFlow.flow_id, {
      host: type === "tts" ? this._ttsHostName : this._sttHostName,
      port: type === "tts" ? this._ttsPort : this._sttPort,
    });
    if (step.type !== "create_entry") {
      throw new Error(
        `${this.hass.localize("ui.panel.config.voice_assistants.satellite_wizard.local.errors.failed_create_entry", { addon: type === "tts" ? this._ttsProviderName : this._sttProviderName })}${"errors" in step ? `: ${step.errors.base}` : ""}`
      );
    }
  }

  private async _pickOrCreatePipelineExists() {
    // Check if a pipeline already exists with local TTS and STT

    if (!this._localStt?.length || !this._localTts?.length) {
      return;
    }

    const pipelines = await listAssistPipelines(this.hass);

    if (pipelines.preferred_pipeline) {
      pipelines.pipelines.sort((a) =>
        a.id === pipelines.preferred_pipeline ? -1 : 0
      );
    }

    const ttsEntityIds = this._localTts.map((ent) => ent.entity_id);
    const sttEntityIds = this._localStt.map((ent) => ent.entity_id);

    let localPipeline = pipelines.pipelines.find(
      (pipeline) =>
        pipeline.conversation_engine === "conversation.home_assistant" &&
        pipeline.tts_engine &&
        ttsEntityIds.includes(pipeline.tts_engine) &&
        pipeline.stt_engine &&
        sttEntityIds.includes(pipeline.stt_engine) &&
        pipeline.language.split("-")[0] === this.language.split("-")[0]
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
    this._nextStep();
  }

  private async _createPipeline(ttsEntityId: string, sttEntityId: string) {
    // Create a pipeline with local TTS and STT

    const pipelines = await listAssistPipelines(this.hass);

    const agent = (
      await listAgents(
        this.hass,
        this.language || this.hass.config.language,
        this.hass.config.country || undefined
      )
    ).agents.find((agnt) => agnt.id === "conversation.home_assistant");

    if (!agent?.supported_languages.length) {
      throw new Error(
        "Conversation agent does not support requested language."
      );
    }

    const ttsEngine = (
      await listTTSEngines(
        this.hass,
        this.language,
        this.hass.config.country || undefined
      )
    ).providers.find((provider) => provider.engine_id === ttsEntityId);

    if (!ttsEngine?.supported_languages?.length) {
      throw new Error("TTS engine does not support requested language.");
    }

    const ttsVoices = await listTTSVoices(
      this.hass,
      ttsEntityId,
      ttsEngine.supported_languages[0]
    );

    if (!ttsVoices.voices?.length) {
      throw new Error("No voice available for requested language.");
    }

    const sttEngine = (
      await listSTTEngines(
        this.hass,
        this.language,
        this.hass.config.country || undefined
      )
    ).providers.find((provider) => provider.engine_id === sttEntityId);

    if (!sttEngine?.supported_languages?.length) {
      throw new Error("STT engine does not support requested language.");
    }

    let pipelineName = this.hass.localize(
      `ui.panel.config.voice_assistants.satellite_wizard.local.${this.localOption}_pipeline`
    );
    let i = 1;
    while (
      pipelines.pipelines.find(
        // eslint-disable-next-line no-loop-func
        (pipeline) => pipeline.name === pipelineName
      )
    ) {
      pipelineName = `${this.hass.localize(`ui.panel.config.voice_assistants.satellite_wizard.local.${this.localOption}_pipeline`)} ${i}`;
      i++;
    }

    return createAssistPipeline(this.hass, {
      name: pipelineName,
      language: this.language.split("-")[0],
      conversation_engine: "conversation.home_assistant",
      conversation_language: agent.supported_languages[0],
      stt_engine: sttEntityId,
      stt_language: sttEngine.supported_languages[0],
      tts_engine: ttsEntityId,
      tts_language: ttsEngine.supported_languages[0],
      tts_voice: ttsVoices.voices[0].voice_id,
      wake_word_entity: null,
      wake_word_id: null,
    });
  }

  private async _findEntitiesAndCreatePipeline(tryNo = 0) {
    await this._findLocalEntities();
    if (!this._localTts?.length || !this._localStt?.length) {
      if (tryNo > 3) {
        throw new Error(
          this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.local.errors.could_not_find_entities"
          )
        );
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 2000);
      });
      return this._findEntitiesAndCreatePipeline(tryNo + 1);
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
    this._nextStep();
    return undefined;
  }

  static styles = [
    AssistantSetupStyles,
    css`
      ha-spinner {
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
