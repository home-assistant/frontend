import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { SchemaUnion } from "../../../../components/ha-form/types";
import { AssistPipeline } from "../../../../data/assist_pipeline";
import { HomeAssistant } from "../../../../types";

@customElement("assist-pipeline-detail-conversation")
export class AssistPipelineDetailConversation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public data?: Partial<AssistPipeline>;

  @property() public error?: Record<string, string>;

  private _schema = memoizeOne(
    (language?: string) =>
      [
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
          required: true,
          selector: {
            text: {},
          },
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
        <ha-form
          .schema=${this._schema(this.data?.language)}
          .data=${this.data}
          .error=${this.error}
          .hass=${this.hass}
          .computeLabel=${this._computeLabel}
        ></ha-form>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-detail-conversation": AssistPipelineDetailConversation;
  }
}
