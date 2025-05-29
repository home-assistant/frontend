import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import type { AssistPipeline } from "../../../../data/assist_pipeline";
import type { HomeAssistant } from "../../../../types";
import "../../../../components/ha-form/ha-form";
import { fireEvent } from "../../../../common/dom/fire_event";

@customElement("assist-pipeline-detail-conversation")
export class AssistPipelineDetailConversation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data?: Partial<AssistPipeline>;

  @state() private _supportedLanguages?: "*" | string[];

  private _schema = memoizeOne(
    (
      engine?: string,
      language?: string,
      supportedLanguages?: "*" | string[]
    ) => {
      const fields: any = [
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "conversation_engine",
              required: true,
              selector: {
                conversation_agent: {
                  language,
                },
              },
            },
          ],
        },
      ];

      if (supportedLanguages !== "*" && supportedLanguages?.length) {
        fields[0].schema.push({
          name: "conversation_language",
          required: true,
          selector: {
            language: { languages: supportedLanguages, no_sort: true },
          },
        });
      }

      if (engine !== "conversation.home_assistant") {
        fields.push({
          name: "prefer_local_intents",
          default: true,
          selector: {
            boolean: {},
          },
        });
      }

      return fields;
    }
  );

  private _computeLabel = (schema): string =>
    schema.name
      ? this.hass.localize(
          `ui.panel.config.voice_assistants.assistants.pipeline.detail.form.${schema.name}` as LocalizeKeys
        )
      : "";

  private _computeHelper = (schema): string =>
    schema.name
      ? this.hass.localize(
          `ui.panel.config.voice_assistants.assistants.pipeline.detail.form.${schema.name}_description` as LocalizeKeys
        )
      : "";

  protected render() {
    return html`
      <div class="section">
        <div class="intro">
          <h3>
            ${this.hass.localize(
              `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.conversation.title`
            )}
          </h3>
          <p>
            ${this.hass.localize(
              `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.conversation.description`
            )}
          </p>
        </div>
        <ha-form
          .schema=${this._schema(
            this.data?.conversation_engine,
            this.data?.language,
            this._supportedLanguages
          )}
          .data=${this.data}
          .hass=${this.hass}
          .computeLabel=${this._computeLabel}
          .computeHelper=${this._computeHelper}
          @supported-languages-changed=${this._supportedLanguagesChanged}
        ></ha-form>
      </div>
    `;
  }

  private _supportedLanguagesChanged(ev) {
    if (ev.detail.value === "*") {
      // wait for update of conversation_engine
      setTimeout(() => {
        const value = { ...this.data };
        value.conversation_language = "*";
        fireEvent(this, "value-changed", { value });
      }, 0);
    }
    this._supportedLanguages = ev.detail.value;
  }

  static styles = css`
    .section {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      box-sizing: border-box;
      padding: 16px;
    }
    .intro {
      margin-bottom: 16px;
    }
    h3 {
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
      margin-top: 0;
      margin-bottom: 4px;
    }
    p {
      color: var(--secondary-text-color);
      font-size: var(--mdc-typography-body2-font-size, var(--ha-font-size-s));
      margin-top: 0;
      margin-bottom: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-detail-conversation": AssistPipelineDetailConversation;
  }
}
