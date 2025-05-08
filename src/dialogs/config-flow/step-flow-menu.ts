import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-icon-next";
import "../../components/ha-list-item";
import type { DataEntryFlowStepMenu } from "../../data/data_entry_flow";
import type { HomeAssistant } from "../../types";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-menu")
class StepFlowMenu extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepMenu;

  @property({ type: Boolean, attribute: "increase-padding-end" })
  public increasePaddingEnd = false;

  protected render(): TemplateResult {
    let options: string[];
    let translations: Record<string, string>;

    if (Array.isArray(this.step.menu_options)) {
      options = this.step.menu_options;
      translations = {};
      for (const option of options) {
        translations[option] = this.flowConfig.renderMenuOption(
          this.hass,
          this.step,
          option
        );
      }
    } else {
      options = Object.keys(this.step.menu_options);
      translations = this.step.menu_options;
    }

    const description = this.flowConfig.renderMenuDescription(
      this.hass,
      this.step
    );

    return html`
      <h2 class=${this.increasePaddingEnd ? "end-space" : ""}>
        ${this.flowConfig.renderMenuHeader(this.hass, this.step)}
      </h2>
      ${description ? html`<div class="content">${description}</div>` : ""}
      <div class="options">
        ${options.map(
          (option) => html`
            <ha-list-item hasMeta .step=${option} @click=${this._handleStep}>
              <span>${translations[option]}</span>
              <ha-icon-next slot="meta"></ha-icon-next>
            </ha-list-item>
          `
        )}
      </div>
    `;
  }

  private _handleStep(ev) {
    fireEvent(this, "flow-update", {
      stepPromise: this.flowConfig.handleFlowStep(
        this.hass,
        this.step.flow_id,
        {
          next_step_id: ev.currentTarget.step,
        }
      ),
    });
  }

  static styles = [
    configFlowContentStyles,
    css`
      .options {
        margin-top: 20px;
        margin-bottom: 8px;
      }
      .content {
        padding-bottom: 16px;
        border-bottom: 1px solid var(--divider-color);
      }
      .content + .options {
        margin-top: 8px;
      }
      ha-list-item {
        --mdc-list-side-padding: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-menu": StepFlowMenu;
  }
}
