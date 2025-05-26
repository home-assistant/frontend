import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import type { AssistPipeline } from "../../../../data/assist_pipeline";
import type { HomeAssistant } from "../../../../types";
import "../../../../components/ha-form/ha-form";

@customElement("assist-pipeline-detail-config")
export class AssistPipelineDetailConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data?: Partial<AssistPipeline>;

  @property({ attribute: false, type: Array })
  public supportedLanguages?: string[];

  public async focus() {
    await this.updateComplete;
    const input = this.renderRoot?.querySelector("ha-form");
    input?.focus();
  }

  private _schema = memoizeOne(
    (supportedLanguages?: string[]) =>
      [
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "name",
              required: true,
              selector: {
                text: {},
              },
            },
            supportedLanguages
              ? {
                  name: "language",
                  required: true,
                  selector: {
                    language: {
                      languages: supportedLanguages,
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

  protected render() {
    return html`
      <div class="section">
        <div class="intro">
          <h3>
            ${this.hass.localize(
              `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.config.title`
            )}
          </h3>
          <p>
            ${this.hass.localize(
              `ui.panel.config.voice_assistants.assistants.pipeline.detail.steps.config.description`
            )}
          </p>
        </div>
        <ha-form
          .schema=${this._schema(this.supportedLanguages)}
          .data=${this.data}
          .hass=${this.hass}
          .computeLabel=${this._computeLabel}
        ></ha-form>
      </div>
    `;
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
    "assist-pipeline-detail-config": AssistPipelineDetailConfig;
  }
}
