import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { SchemaUnion } from "../../../../components/ha-form/types";
import { AssistPipeline } from "../../../../data/assist_pipeline";
import { HomeAssistant } from "../../../../types";

@customElement("assist-pipeline-detail-conversation")
export class AssistPipelineDetailConversation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public data?: Partial<AssistPipeline>;

  private _schema = memoizeOne(
    (language?: string) =>
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
            {
              name: "conversation_language",
              selector: {
                text: {},
              },
            },
          ] as const,
        },
      ] as const
  );

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.voice_assistants.assistants.pipeline.detail.form.${schema.name}`
    );

  protected render() {
    return html`
      <div class="section">
        <div class="intro">
          <h3>Conversation agent</h3>
          <p>
            The conversation agent is the brains of your voice assistant and
            will process the incoming commands.
          </p>
        </div>
        <ha-form
          .schema=${this._schema(this.data?.language)}
          .data=${this.data}
          .hass=${this.hass}
          .computeLabel=${this._computeLabel}
        ></ha-form>
      </div>
    `;
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
        font-weight: normal;
        color: var(--secondary-text-color);
        font-size: 16px;
        line-height: 24px;
        letter-spacing: 0.5px;
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
