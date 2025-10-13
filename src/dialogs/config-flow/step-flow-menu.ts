import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-icon-next";
import "../../components/ha-list-item";
import type { DataEntryFlowStepMenu } from "../../data/data_entry_flow";
import type { HomeAssistant } from "../../types";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";
import { stringCompare } from "../../common/string/compare";

@customElement("step-flow-menu")
class StepFlowMenu extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepMenu;

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      changedProps.size > 1 ||
      !changedProps.has("hass") ||
      this.hass.localize !== changedProps.get("hass")?.localize
    );
  }

  protected render(): TemplateResult {
    let options: string[];
    let translations: Record<string, string>;
    let optionDescriptions: Record<string, string> = {};

    if (Array.isArray(this.step.menu_options)) {
      options = this.step.menu_options;
      translations = {};
      for (const option of options) {
        translations[option] = this.flowConfig.renderMenuOption(
          this.hass,
          this.step,
          option
        );
        optionDescriptions[option] =
          this.flowConfig.renderMenuOptionDescription(
            this.hass,
            this.step,
            option
          );
      }
    } else {
      options = Object.keys(this.step.menu_options);
      translations = this.step.menu_options;
      optionDescriptions = Object.fromEntries(
        options.map((key) => [
          key,
          this.flowConfig.renderMenuOptionDescription(
            this.hass,
            this.step,
            key
          ),
        ])
      );
    }

    if (this.step.sort) {
      options = options.sort((a, b) =>
        stringCompare(
          translations[a]!,
          translations[b]!,
          this.hass.locale.language
        )
      );
    }

    const description = this.flowConfig.renderMenuDescription(
      this.hass,
      this.step
    );

    return html`
      ${description ? html`<div class="content">${description}</div>` : ""}
      <div class="options">
        ${options.map(
          (option) => html`
            <ha-list-item
              hasMeta
              .step=${option}
              @click=${this._handleStep}
              ?twoline=${optionDescriptions[option]}
              ?multiline-secondary=${optionDescriptions[option]}
            >
              <span>${translations[option]}</span>
              ${optionDescriptions[option]
                ? html`<span slot="secondary">
                    ${optionDescriptions[option]}
                  </span>`
                : nothing}
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
        margin-bottom: 16px;
      }
      .content {
        padding-bottom: 16px;
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
