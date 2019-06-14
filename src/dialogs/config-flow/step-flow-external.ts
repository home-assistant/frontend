import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  property,
  CSSResultArray,
  css,
} from "lit-element";
import "@material/mwc-button";

import {
  ConfigFlowStepExternal,
  DataEntryFlowProgressedEvent,
  fetchConfigFlow,
} from "../../data/config_entries";
import { HomeAssistant } from "../../types";
import { localizeKey } from "../../common/translations/localize";
import { fireEvent } from "../../common/dom/fire_event";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-external")
class StepFlowExternal extends LitElement {
  @property()
  public hass!: HomeAssistant;

  @property()
  private step!: ConfigFlowStepExternal;

  protected render(): TemplateResult | void {
    const localize = this.hass.localize;
    const step = this.step;

    const description = localizeKey(
      localize,
      `component.${step.handler}.config.${step.step_id}.description`,
      step.description_placeholders
    );

    return html`
      <h2>
        ${localize(
          `component.${step.handler}.config.step.${step.step_id}.title`
        )}
      </h2>
      <div class="content">
        <p>
          ${localize(
            "ui.panel.config.integrations.config_flow.external_step.description"
          )}
        </p>
        ${description
          ? html`
              <ha-markdown .content=${description} allow-svg></ha-markdown>
            `
          : ""}
        <div class="open-button">
          <a href=${this.step.url} target="_blank">
            <mwc-button raised>
              ${localize(
                "ui.panel.config.integrations.config_flow.external_step.open_site"
              )}
            </mwc-button>
          </a>
        </div>
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.hass.connection.subscribeEvents<DataEntryFlowProgressedEvent>(
      async (ev) => {
        if (ev.data.flow_id !== this.step.flow_id) {
          return;
        }

        fireEvent(this, "flow-update", {
          stepPromise: fetchConfigFlow(this.hass, this.step.flow_id),
        });
      },
      "data_entry_flow_progressed"
    );
    window.open(this.step.url);
  }

  static get styles(): CSSResultArray {
    return [
      configFlowContentStyles,
      css`
        .open-button {
          text-align: center;
          padding: 24px 0;
        }
        .open-button a {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-external": StepFlowExternal;
  }
}
