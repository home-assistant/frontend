import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { LocalizeKeys } from "../../../../common/translations/localize";
import { AssistPipeline } from "../../../../data/assist_pipeline";
import { HomeAssistant } from "../../../../types";
import "../../../../components/ha-form/ha-form";
import { fireEvent } from "../../../../common/dom/fire_event";

@customElement("assist-pipeline-detail-conversation")
export class AssistPipelineDetailConversation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public data?: Partial<AssistPipeline>;

  @state() private _supportedLanguages?: "*" | string[];

  private _schema = memoizeOne(
    (language?: string, supportedLanguages?: "*" | string[]) =>
      [
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
            supportedLanguages !== "*" && supportedLanguages?.length
              ? {
                  name: "conversation_language",
                  required: true,
                  selector: {
                    language: { languages: supportedLanguages, no_sort: true },
                  },
                }
              : { name: "", type: "constant" },
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
          .schema=${this._schema(this.data?.language, this._supportedLanguages)}
          .data=${this.data}
          .hass=${this.hass}
          .computeLabel=${this._computeLabel}
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

  static get styles(): CSSResultGroup {
    return css`
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-detail-conversation": AssistPipelineDetailConversation;
  }
}
