import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import { AssistPipeline } from "../../../../data/assist_pipeline";
import { HomeAssistant } from "../../../../types";
import { fetchWakeWordInfo, WakeWord } from "../../../../data/wake_word";
import { documentationUrl } from "../../../../util/documentation-url";
import { fireEvent } from "../../../../common/dom/fire_event";

@customElement("assist-pipeline-detail-wakeword")
export class AssistPipelineDetailWakeWord extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public data?: Partial<AssistPipeline>;

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

  private _hasWakeWorkEntities = memoizeOne((states: HomeAssistant["states"]) =>
    Object.keys(states).some((entityId) => entityId.startsWith("wake_word."))
  );

  protected render() {
    const hasWakeWorkEntities = this._hasWakeWorkEntities(this.hass.states);
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
          ${!hasWakeWorkEntities
            ? html`${this.hass.localize(
                  `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.wakeword.no_wake_words`
                )}
                <a
                  href=${documentationUrl(this.hass, "/docs/assist/")}
                  target="_blank"
                  rel="noreferrer noopener"
                  >${this.hass.localize(
                    `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.wakeword.no_wake_words_link`
                  )}</a
                >`
            : nothing}
          <ha-form
            .schema=${this._schema(this._wakeWords)}
            .data=${this.data}
            .hass=${this.hass}
            .computeLabel=${this._computeLabel}
            .disabled=${!hasWakeWorkEntities}
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
      a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-detail-wakeword": AssistPipelineDetailWakeWord;
  }
}
