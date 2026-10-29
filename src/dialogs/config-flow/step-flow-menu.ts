import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-icon-next";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-base";
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

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
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
      ${description ? html`<div class="content">${description}</div>` : nothing}
      <ha-list-base class="options">
        ${options.map((option) => {
          const optionDescription = optionDescriptions[option];
          return html`
            <ha-list-item-button
              .headline=${translations[option]}
              .step=${option}
              @click=${this._handleStep}
            >
              ${
                optionDescription
                  ? html`<span slot="supporting-text" class="description"
                      >${optionDescription}</span
                    >`
                  : nothing
              }
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-list-item-button>
          `;
        })}
      </ha-list-base>
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
        margin-top: var(--ha-space-5);
        margin-bottom: var(--ha-space-4);
      }
      .content {
        padding-bottom: var(--ha-space-4);
      }
      .content + .options {
        margin-top: var(--ha-space-2);
      }
      ha-list-item-button {
        --ha-row-item-padding-inline: var(--ha-space-6);
      }
      .description {
        white-space: normal;
      }
      ha-icon-next {
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-menu": StepFlowMenu;
  }
}
