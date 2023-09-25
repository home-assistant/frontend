import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import { AssistPipeline } from "../../../../data/assist_pipeline";
import { HomeAssistant } from "../../../../types";

@customElement("assist-pipeline-detail-wakeword")
export class AssistPipelineDetailWakeWord extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public data?: Partial<AssistPipeline>;

  @state() private _wakeWords?: string[];

  private _schema = memoizeOne(
    (wakeWords?: string[]) =>
      [
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "wake_word_entity",
              selector: {
                entity: {
                  domain: "wake_word",
                },
              },
            },
            wakeWords?.length
              ? {
                  name: "wake_word_id",
                  required: true,
                  selector: {
                    select: {},
                  },
                }
              : { name: "wake_word_id", selector: { text: {} } },
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

  protected willUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("data") &&
      changedProps.get("data")?.wake_word_entity !== this.data?.wake_word_entity
    ) {
      this._fetchWakeWords();
    }
  }

  protected render() {
    return html`
      <div class="section">
        <div class="content">
          <div class="intro">
            <h3>
              ${this.hass.localize(
                `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.wakeword.title`
              )}
            </h3>
            <p>
              ${this.hass.localize(
                `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.wakeword.description`
              )}
            </p>
          </div>
          <ha-form
            .schema=${this._schema(this._wakeWords)}
            .data=${this.data}
            .hass=${this.hass}
            .computeLabel=${this._computeLabel}
          ></ha-form>
        </div>
      </div>
    `;
  }

  private async _fetchWakeWords() {
    if (!this.data?.wake_word_entity) {
      this._wakeWords = undefined;
      // eslint-disable-next-line no-useless-return
      return;
    }
    // to be implemented
    // this._wakeWords = await fetchWakeWords(this.hass, this.data.wake_word_entity);
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-detail-wakeword": AssistPipelineDetailWakeWord;
  }
}
