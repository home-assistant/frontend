import { mdiDownload } from "@mdi/js";
import { dump } from "js-yaml";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import "../../../components/ha-button";
import "../../../components/ha-code-editor";
import "../../../components/ha-language-picker";
import "../../../components/ha-textarea";
import type { HaTextArea } from "../../../components/ha-textarea";
import {
  AssitDebugResult,
  debugAgent,
  listAgents,
} from "../../../data/conversation";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { formatLanguageCode } from "../../../common/language/format_language";
import { storage } from "../../../common/decorators/storage";
import { fileDownload } from "../../../util/file_download";

type SentenceParsingResult = {
  sentence: string;
  language: string;
  result: AssitDebugResult | null;
};

@customElement("developer-tools-assist")
class HaPanelDevAssist extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() supportedLanguages?: string[];

  @storage({
    key: "assist_debug_language",
    state: true,
    subscribe: false,
    storage: "localStorage",
  })
  _language?: string;

  @state() _results: SentenceParsingResult[] = [];

  @query("#sentences-input") _sentencesInput!: HaTextArea;

  @state() _validInput = false;

  private _languageChanged(ev) {
    this._language = ev.detail.value;
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.code !== "Enter" || e.shiftKey) {
      return;
    }
    e.preventDefault();
    this._parse();
  }

  private _textAreaInput(ev) {
    const value = ev.target.value;
    const valid = Boolean(value);
    if (valid !== this._validInput) {
      this._validInput = valid;
    }
  }

  private async _parse() {
    const sentences = this._sentencesInput.value
      .split("\n")
      .filter((a) => a !== "");
    const { results } = await debugAgent(this.hass, sentences, this._language!);

    this._sentencesInput.value = "";

    const newResults: SentenceParsingResult[] = [];
    sentences.forEach((sentence, index) => {
      const result = results[index];

      newResults.push({
        sentence,
        language: this._language!,
        result,
      });
    });
    this._results = [...newResults, ...this._results];
  }

  private async _fetchLanguages() {
    const { agents } = await listAgents(this.hass);
    const assistAgent = agents.find((agent) => agent.id === "homeassistant");
    this.supportedLanguages =
      assistAgent?.supported_languages === "*"
        ? undefined
        : assistAgent?.supported_languages;

    if (
      !this._language &&
      this.supportedLanguages?.includes(this.hass.locale.language)
    ) {
      this._language = this.hass.locale.language;
    } else if (!this._language) {
      this._language = "en";
    }
  }

  protected firstUpdated(): void {
    this._fetchLanguages();
  }

  protected render() {
    return html`
      <div class="content">
        <ha-card
          .header=${this.hass.localize(
            "ui.panel.developer-tools.tabs.assist.title"
          )}
          class="form"
        >
          <div class="card-content">
            <p class="description">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.assist.description"
              )}
            </p>
            ${this.supportedLanguages
              ? html`
                  <ha-language-picker
                    .languages=${this.supportedLanguages}
                    .hass=${this.hass}
                    .value=${this._language}
                    @value-changed=${this._languageChanged}
                  ></ha-language-picker>
                `
              : nothing}
            <ha-textarea
              autogrow
              .label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.assist.sentences"
              )}
              id="sentences-input"
              @input=${this._textAreaInput}
              @keydown=${this._handleKeyDown}
            ></ha-textarea>
          </div>
          <div class="card-actions">
            <ha-button
              @click=${this._parse}
              .disabled=${!this._language || !this._validInput}
            >
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.assist.parse_sentences"
              )}
            </ha-button>
          </div>
        </ha-card>

        ${this._results.length
          ? html`
              <div class="result-toolbar">
                <ha-button outlined @click=${this._download}>
                  <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.developer-tools.tabs.assist.download_results"
                  )}
                </button>
              </div>
            `
          : ""}
        ${this._results.map((r) => {
          const { sentence, result, language } = r;
          const matched = result != null;

          return html`
            <ha-card class="result">
              <div class="card-content">
                <div class="sentence">
                  <p>${sentence}</p>
                  <p>${matched ? "✅" : "❌"}</p>
                </div>
                <div class="info">
                  ${this.hass.localize(
                    "ui.panel.developer-tools.tabs.assist.language"
                  )}:
                  ${formatLanguageCode(language, this.hass.locale)}
                  (${language})
                </div>
                ${result
                  ? html`
                      <ha-code-editor
                        mode="yaml"
                        .hass=${this.hass}
                        .value=${dump(result).trimRight()}
                        read-only
                        dir="ltr"
                      ></ha-code-editor>
                    `
                  : html`<ha-alert alert-type="error">
                      ${this.hass.localize(
                        "ui.panel.developer-tools.tabs.assist.no_match"
                      )}
                    </ha-alert>`}
              </div>
            </ha-card>
          `;
        })}
      </div>
    `;
  }

  private _download() {
    fileDownload(
      `data:text/plain;charset=utf-8,${encodeURIComponent(
        JSON.stringify({ results: this._results }, null, 2)
      )}`,
      `intent_results.json`
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 28px 20px 16px;
          padding: max(28px, calc(12px + env(safe-area-inset-top)))
            max(20px, calc(4px + env(safe-area-inset-right)))
            max(16px, env(safe-area-inset-bottom))
            max(20px, calc(4px + env(safe-area-inset-left)));
          max-width: 1040px;
          margin: 0 auto;
        }
        .description {
          margin: 0;
          margin-bottom: 16px;
        }
        ha-textarea {
          width: 100%;
        }
        .card-actions {
          text-align: right;
        }
        .form {
          margin-bottom: 16px;
        }
        .result-toolbar {
          text-align: center;
          margin-bottom: 16px;
        }
        .result {
          margin-bottom: 16px;
        }
        .sentence {
          font-weight: 500;
          margin-bottom: 8px;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        .sentence p {
          margin: 0;
        }
        .info p {
          margin: 0;
        }
        ha-code-editor,
        ha-alert {
          display: block;
          margin-top: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-assist": HaPanelDevAssist;
  }
}
