import {
  LitElement,
  TemplateResult,
  html,
  css,
  customElement,
  property,
  CSSResult,
} from "lit-element";
import "@material/mwc-button";

import { ConfigFlowStepCreateEntry } from "../../data/config_entries";
import { HomeAssistant } from "../../types";
import { localizeKey } from "../../common/translations/localize";
import { fireEvent } from "../../common/dom/fire_event";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-create-entry")
class StepFlowCreateEntry extends LitElement {
  @property()
  public hass!: HomeAssistant;

  @property()
  private step!: ConfigFlowStepCreateEntry;

  protected render(): TemplateResult | void {
    const localize = this.hass.localize;
    const step = this.step;

    const description = localizeKey(
      localize,
      `component.${step.handler}.config.create_entry.${step.description ||
        "default"}`,
      step.description_placeholders
    );

    return html`
        <h2>Success!</h2>
        <div class="content">
          ${
            description
              ? html`
                  <ha-markdown .content=${description} allow-svg></ha-markdown>
                `
              : ""
          }
          <p>Created config for ${step.title}</p>
        </div>
        <div class="buttons">
          <mwc-button @click="${this._flowDone}">Close</mwc-button>
        </div>
      </paper-dialog>
    `;
  }

  private _flowDone(): void {
    fireEvent(this, "flow-update", { step: undefined });
  }

  static get styles(): CSSResult {
    return configFlowContentStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-create-entry": StepFlowCreateEntry;
  }
}
