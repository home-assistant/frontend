import type { CSSResultGroup, TemplateResult, PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { sanitizeHttpUrl } from "../../common/url/sanitize-http-url";
import type { DataEntryFlowStepExternal } from "../../data/data_entry_flow";
import type { HomeAssistant } from "../../types";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-external")
class StepFlowExternal extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepExternal;

  protected render(): TemplateResult {
    return html`
      <div class="content">
        ${this.flowConfig.renderExternalStepDescription(this.hass, this.step)}
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    // Opened without user interaction, so only ever follow an http(s) URL
    const url = sanitizeHttpUrl(this.step.url);
    if (url) {
      window.open(url);
    }
  }

  static get styles(): CSSResultGroup {
    return [configFlowContentStyles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-external": StepFlowExternal;
  }
}
