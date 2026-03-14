import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { formatLanguageCode } from "../../common/language/format_language";
import type { LocalizeFunc } from "../../common/translations/localize";
import "../../components/ha-select-box";
import type { SelectBoxOption } from "../../components/ha-select-box";
import {
  createAssistPipeline,
  listAssistPipelines,
} from "../../data/assist_pipeline";
import type { AssistSatelliteConfiguration } from "../../data/assist_satellite";
import { fetchCloudStatus } from "../../data/cloud";
import type { LanguageScore, LanguageScores } from "../../data/conversation";
import { getLanguageScores, listAgents } from "../../data/conversation";
import { listSTTEngines } from "../../data/stt";
import { listTTSEngines, listTTSVoices } from "../../data/tts";
import type { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";
import { documentationUrl } from "../../util/documentation-url";

const OPTIONS = ["cloud", "focused_local", "full_local"] as const;

const EMPTY_SCORE: LanguageScore = {
  cloud: 0,
  focused_local: 0,
  full_local: 0,
};

@customElement("ha-voice-assistant-setup-step-pipeline")
export class HaVoiceAssistantSetupStepPipeline extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property({ attribute: false }) public deviceId!: string;

  @property({ attribute: false }) public assistEntityId?: string;

  @property({ attribute: false }) public language?: string;

  @property({ attribute: false }) public languages: string[] = [];

  @state() private _cloudChecked = false;

  @state() private _value?: (typeof OPTIONS)[number];

  @state() private _languageScores?: LanguageScores;

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (!this.hasUpdated) {
      this._fetchData();
    }

    if (
      (changedProperties.has("language") ||
        changedProperties.has("_languageScores")) &&
      this.language &&
      this._languageScores
    ) {
      const lang = this.language;
      if (this._value && this._languageScores[lang]?.[this._value] === 0) {
        this._value = undefined;
      }
      if (!this._value) {
        this._value = this._getOptions(
          this._languageScores[lang] || EMPTY_SCORE,
          this.hass.localize
        ).supportedOptions[0]?.value as
          | "cloud"
          | "focused_local"
          | "full_local"
          | undefined;
      }
    }
  }

  private _getOptions = memoizeOne((score, localize: LocalizeFunc) => {
    const supportedOptions: SelectBoxOption[] = [];
    const unsupportedOptions: SelectBoxOption[] = [];

    OPTIONS.forEach((option) => {
      if (score[option] > 0) {
        supportedOptions.push({
          label: localize(
            `ui.panel.config.voice_assistants.satellite_wizard.pipeline.options.${option}.label`
          ),
          description: localize(
            `ui.panel.config.voice_assistants.satellite_wizard.pipeline.options.${option}.description`
          ),
          value: option,
        });
      } else {
        unsupportedOptions.push({
          label: localize(
            `ui.panel.config.voice_assistants.satellite_wizard.pipeline.options.${option}.label`
          ),
          value: option,
        });
      }
    });

    return { supportedOptions, unsupportedOptions };
  });

  protected override render() {
    if (!this._cloudChecked || !this._languageScores) {
      return nothing;
    }

    if (!this.language) {
      const language = formatLanguageCode(
        this.hass.config.language,
        this.hass.locale
      );
      return html`<div class="content">
        <h1>
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.pipeline.unsupported_language.header"
          )}
        </h1>
        ${this.hass.localize(
          "ui.panel.config.voice_assistants.satellite_wizard.pipeline.unsupported_language.secondary",
          { language }
        )}
        <ha-language-picker
          .hass=${this.hass}
          .label=${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.pipeline.unsupported_language.language_picker"
          )}
          .languages=${this.languages}
          @value-changed=${this._languageChanged}
        ></ha-language-picker>

        <a
          href=${documentationUrl(
            this.hass,
            "/voice_control/contribute-voice/"
          )}
          >${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.pipeline.unsupported_language.contribute",
            { language }
          )}</a
        >
      </div>`;
    }

    const score = this._languageScores[this.language] || EMPTY_SCORE;

    const options = this._getOptions(score, this.hass.localize);

    const performance = !this._value
      ? ""
      : this._value === "full_local"
        ? "low"
        : "high";

    const commands = !this._value
      ? ""
      : score[this._value] > 2
        ? "high"
        : score[this._value] > 1
          ? "ready"
          : score[this._value] > 0
            ? "low"
            : "";

    return html`<div class="content">
        <h1>
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.pipeline.title"
          )}
        </h1>
        <div class="bar-header">
          <span
            >${this.hass.localize(
              "ui.panel.config.voice_assistants.satellite_wizard.pipeline.performance.header"
            )}</span
          ><span
            >${!performance
              ? ""
              : this.hass.localize(
                  `ui.panel.config.voice_assistants.satellite_wizard.pipeline.performance.${performance}`
                )}</span
          >
        </div>
        <div class="perf-bar ${performance}">
          <div class="segment"></div>
          <div class="segment"></div>
          <div class="segment"></div>
        </div>
        <div class="bar-header">
          <span
            >${this.hass.localize(
              "ui.panel.config.voice_assistants.satellite_wizard.pipeline.commands.header"
            )}</span
          ><span
            >${!commands
              ? ""
              : this.hass.localize(
                  `ui.panel.config.voice_assistants.satellite_wizard.pipeline.commands.${commands}`
                )}</span
          >
        </div>
        <div class="perf-bar ${commands}">
          <div class="segment"></div>
          <div class="segment"></div>
          <div class="segment"></div>
        </div>
        <ha-select-box
          max_columns="1"
          .options=${options.supportedOptions}
          .value=${this._value}
          @value-changed=${this._valueChanged}
        ></ha-select-box>
        ${options.unsupportedOptions.length
          ? html`<h3>
                ${this.hass.localize(
                  "ui.panel.config.voice_assistants.satellite_wizard.pipeline.unsupported"
                )}
              </h3>
              <ha-select-box
                max_columns="1"
                .options=${options.unsupportedOptions}
                disabled
              ></ha-select-box>`
          : nothing}
      </div>
      <div class="footer">
        <ha-button @click=${this._createPipeline} .disabled=${!this._value}
          >${this.hass.localize("ui.common.next")}</ha-button
        >
      </div>`;
  }

  private async _fetchData() {
    const cloud =
      (await this._hasCloud()) && (await this._createCloudPipeline(false));
    if (!cloud) {
      this._cloudChecked = true;
      this._languageScores = (await getLanguageScores(this.hass)).languages;
    }
  }

  private async _hasCloud(): Promise<boolean> {
    if (!isComponentLoaded(this.hass, "cloud")) {
      return false;
    }
    const cloudStatus = await fetchCloudStatus(this.hass);
    if (!cloudStatus.logged_in || !cloudStatus.active_subscription) {
      return false;
    }
    return true;
  }

  private async _createCloudPipeline(useLanguage: boolean): Promise<boolean> {
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
    try {
      const pipelines = await listAssistPipelines(this.hass);

      if (pipelines.preferred_pipeline) {
        pipelines.pipelines.sort((a) =>
          a.id === pipelines.preferred_pipeline ? -1 : 0
        );
      }

      let cloudPipeline = pipelines.pipelines.find(
        (pipeline) =>
          pipeline.conversation_engine === "conversation.home_assistant" &&
          pipeline.tts_engine === cloudTtsEntityId &&
          pipeline.stt_engine === cloudSttEntityId &&
          (!useLanguage ||
            pipeline.language.split("-")[0] === this.language!.split("-")[0])
      );

      if (!cloudPipeline) {
        const agent = (
          await listAgents(
            this.hass,
            this.language || this.hass.config.language,
            this.hass.config.country || undefined
          )
        ).agents.find((agnt) => agnt.id === "conversation.home_assistant");

        if (!agent?.supported_languages.length) {
          return false;
        }

        const ttsEngine = (
          await listTTSEngines(
            this.hass,
            this.language || this.hass.config.language,
            this.hass.config.country || undefined
          )
        ).providers.find((provider) => provider.engine_id === cloudTtsEntityId);

        if (!ttsEngine?.supported_languages?.length) {
          return false;
        }

        const ttsVoices = await listTTSVoices(
          this.hass,
          cloudTtsEntityId,
          ttsEngine.supported_languages[0]
        );

        const sttEngine = (
          await listSTTEngines(
            this.hass,
            this.language || this.hass.config.language,
            this.hass.config.country || undefined
          )
        ).providers.find((provider) => provider.engine_id === cloudSttEntityId);

        if (!sttEngine?.supported_languages?.length) {
          return false;
        }

        let pipelineName = "Home Assistant Cloud";
        let i = 1;
        while (
          pipelines.pipelines.find(
            // eslint-disable-next-line no-loop-func
            (pipeline) => pipeline.name === pipelineName
          )
        ) {
          pipelineName = `Home Assistant Cloud ${i}`;
          i++;
        }

        cloudPipeline = await createAssistPipeline(this.hass, {
          name: pipelineName,
          language: (this.language || this.hass.config.language).split("-")[0],
          conversation_engine: "conversation.home_assistant",
          conversation_language: agent.supported_languages[0],
          stt_engine: cloudSttEntityId,
          stt_language: sttEngine.supported_languages[0],
          tts_engine: cloudTtsEntityId,
          tts_language: ttsEngine.supported_languages[0],
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
      return true;
    } catch (_e) {
      return false;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    this._value = ev.detail.value;
  }

  private async _setupCloud() {
    if (await this._hasCloud()) {
      this._createCloudPipeline(true);
      return;
    }
    fireEvent(this, "next-step", { step: STEP.CLOUD });
  }

  private _createPipeline() {
    if (this._value === "cloud") {
      this._setupCloud();
    } else if (this._value === "focused_local") {
      this._setupLocalFocused();
    } else {
      this._setupLocalFull();
    }
  }

  private _setupLocalFocused() {
    fireEvent(this, "next-step", { step: STEP.LOCAL, option: this._value });
  }

  private _setupLocalFull() {
    fireEvent(this, "next-step", { step: STEP.LOCAL, option: this._value });
  }

  private _languageChanged(ev: CustomEvent) {
    if (!ev.detail.value) {
      return;
    }
    fireEvent(this, "language-changed", { value: ev.detail.value });
  }

  static styles = [
    AssistantSetupStyles,
    css`
      :host {
        text-align: left;
      }
      .perf-bar {
        width: 100%;
        height: 10px;
        display: flex;
        gap: var(--ha-space-1);
        margin: 8px 0;
      }
      .segment {
        flex-grow: 1;
        background-color: var(--disabled-color);
        transition: background-color 0.3s;
      }
      .segment:first-child {
        border-radius: var(--ha-border-radius-sm) var(--ha-border-radius-square)
          var(--ha-border-radius-square) var(--ha-border-radius-sm);
      }
      .segment:last-child {
        border-radius: var(--ha-border-radius-square) var(--ha-border-radius-sm)
          var(--ha-border-radius-sm) var(--ha-border-radius-square);
      }
      .perf-bar.high .segment {
        background-color: var(--success-color);
      }
      .perf-bar.ready .segment:nth-child(-n + 2) {
        background-color: var(--warning-color);
      }
      .perf-bar.low .segment:nth-child(1) {
        background-color: var(--error-color);
      }
      .bar-header {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
        margin-top: 16px;
      }
      ha-select-box {
        display: block;
      }
      ha-select-box:first-of-type {
        margin-top: 32px;
      }
      .footer {
        margin-top: 16px;
      }
      ha-language-picker {
        display: block;
        margin-top: 16px;
        margin-bottom: 16px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-pipeline": HaVoiceAssistantSetupStepPipeline;
  }
}
