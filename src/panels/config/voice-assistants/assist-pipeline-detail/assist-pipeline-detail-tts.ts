import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-button";
import "../../../../components/ha-form/ha-form";
import { AssistPipeline } from "../../../../data/assist_pipeline";
import { showTTSTryDialog } from "../../../../dialogs/tts-try/show-dialog-tts-try";
import { HomeAssistant } from "../../../../types";

@customElement("assist-pipeline-detail-tts")
export class AssistPipelineDetailTTS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public data?: Partial<AssistPipeline>;

  @state() private _supportedLanguages?: string[];

  private _schema = memoizeOne(
    (language?: string, supportedLanguages?: string[]) =>
      [
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "tts_engine",
              selector: {
                tts: {
                  language,
                },
              },
            },
            supportedLanguages?.length
              ? {
                  name: "tts_language",
                  required: true,
                  selector: {
                    language: { languages: supportedLanguages, no_sort: true },
                  },
                }
              : { name: "", type: "constant" },
            {
              name: "tts_voice",
              selector: {
                tts_voice: {},
              },
              context: { language: "tts_language", engineId: "tts_engine" },
              required: true,
            },
          ] as const,
        },
      ] as const
  );

  private _computeLabel = (schema): string =>
    schema.name
      ? this.hass.localize(
          `ui.panel.config.voice_assistants.assistants.pipeline.detail.form.${schema.name}` as LocalizeKeys
        )
      : "";

  protected render() {
    return html`
      <div class="section">
        <div class="content">
          <div class="intro">
          <h3>
            ${this.hass.localize(
              `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.tts.title`
            )}
          </h3>
          <p>
            ${this.hass.localize(
              `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.tts.description`
            )}
          </p>
          </div>
          <ha-form
            .schema=${this._schema(
              this.data?.language,
              this._supportedLanguages
            )}
            .data=${this.data}
            .hass=${this.hass}
            .computeLabel=${this._computeLabel}
            @supported-languages-changed=${this._supportedLanguagesChanged}
          ></ha-form>
        </div>

       ${
         this.data?.tts_engine
           ? html`<div class="footer">
               <ha-button
                 .label=${this.hass.localize(
                   "ui.panel.config.voice_assistants.assistants.pipeline.detail.try_tts"
                 )}
                 @click=${this._preview}
               >
               </ha-button>
             </div>`
           : nothing
       }
        </div>
      </div>
    `;
  }

  private async _preview() {
    if (!this.data) return;

    const engine = this.data.tts_engine;
    const language = this.data.tts_language || undefined;
    const voice = this.data.tts_voice || undefined;

    if (!engine) return;

    showTTSTryDialog(this, {
      engine,
      language,
      voice,
    });
  }

  private _supportedLanguagesChanged(ev) {
    this._supportedLanguages = ev.detail.value;
  }

  static get styles(): CSSResultGroup {
    return css`
      .section {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
      }
      .content {
        padding: 16px;
      }
      .intro {
        margin-bottom: 16px;
      }
      h3 {
        font-weight: normal;
        font-size: 22px;
        line-height: 28px;
        margin-top: 0;
        margin-bottom: 4px;
      }
      p {
        color: var(--secondary-text-color);
        font-size: var(--mdc-typography-body2-font-size, 0.875rem);
        margin-top: 0;
        margin-bottom: 0;
      }
      .footer {
        border-top: 1px solid var(--divider-color);
        padding: 8px 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-detail-tts": AssistPipelineDetailTTS;
  }
}
