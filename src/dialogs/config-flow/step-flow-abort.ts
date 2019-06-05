import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  property,
  CSSResult,
} from "lit-element";
import "@material/mwc-button";

import { ConfigFlowStepAbort } from "../../data/config_entries";
import { HomeAssistant } from "../../types";
import { localizeKey } from "../../common/translations/localize";
import { fireEvent } from "../../common/dom/fire_event";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-abort")
class StepFlowAbort extends LitElement {
  @property()
  public hass!: HomeAssistant;

  @property()
  private step!: ConfigFlowStepAbort;

  protected render(): TemplateResult | void {
    const localize = this.hass.localize;
    const step = this.step;

    const description = localizeKey(
      localize,
      `component.${step.handler}.config.abort.${step.reason}`,
      step.description_placeholders
    );

    return html`
      <h2>Aborted</h2>
      <div class="content">
        ${description
          ? html`
              <ha-markdown .content=${description} allow-svg></ha-markdown>
            `
          : ""}
      </div>
      <div class="buttons">
        <mwc-button @click="${this._flowDone}">Close</mwc-button>
      </div>
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
    "step-flow-abort": StepFlowAbort;
  }
}
