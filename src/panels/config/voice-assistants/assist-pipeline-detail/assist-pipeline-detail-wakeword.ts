import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { AssistPipeline } from "../../../../data/assist_pipeline";
import type { HomeAssistant } from "../../../../types";
import type { WakeWord } from "../../../../data/wake_word";
import { fetchWakeWordInfo } from "../../../../data/wake_word";
import { fireEvent } from "../../../../common/dom/fire_event";

@customElement("assist-pipeline-detail-wakeword")
export class AssistPipelineDetailWakeWord extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data?: Partial<AssistPipeline>;

  @state() private _wakeWords?: WakeWord[];

  private _schema = memoizeOne(
    (wakeWords?: WakeWord[]) =>
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
                    select: {
                      mode: "dropdown",
                      sort: true,
                      options: wakeWords.map((ww) => ({
                        value: ww.id,
                        label: ww.name,
                      })),
                    },
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

  protected willUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("data") &&
      changedProps.get("data")?.wake_word_entity !== this.data?.wake_word_entity
    ) {
      if (
        changedProps.get("data")?.wake_word_entity &&
        this.data?.wake_word_id
      ) {
        fireEvent(this, "value-changed", {
          value: { ...this.data, wake_word_id: undefined },
        });
      }
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
            <ha-alert alert-type="info">
              ${this.hass.localize(
                `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.wakeword.note`
              )}
            </ha-alert>
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
    this._wakeWords = undefined;
    if (!this.data?.wake_word_entity) {
      return;
    }
    const wakeWordEntity = this.data.wake_word_entity;
    const wakewordInfo = await fetchWakeWordInfo(this.hass, wakeWordEntity);
    if (this.data.wake_word_entity !== wakeWordEntity) {
      // wake word entity changed while we were fetching
      return;
    }
    this._wakeWords = wakewordInfo.wake_words;
    if (
      this.data &&
      (!this.data?.wake_word_id ||
        !this._wakeWords.some((ww) => ww.id === this.data!.wake_word_id))
    ) {
      fireEvent(this, "value-changed", {
        value: { ...this.data, wake_word_id: this._wakeWords[0]?.id },
      });
    }
  }

  static styles = css`
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
    a {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-detail-wakeword": AssistPipelineDetailWakeWord;
  }
}
