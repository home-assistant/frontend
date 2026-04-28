import "@home-assistant/webawesome/dist/components/divider/divider";
import { mdiClose, mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-icon-button";
import "../../../../../components/input/ha-input";
import type { HaInput } from "../../../../../components/input/ha-input";
import type { ConversationTrigger } from "../../../../../data/automation";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";

const PATTERN = "^[^.。,，?¿？؟!！;；:：]+$";

@customElement("ha-automation-trigger-conversation")
export class HaConversationTrigger
  extends LitElement
  implements TriggerElement
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: ConversationTrigger;

  @property({ type: Boolean }) public disabled = false;

  @query("#option_input", true) private _optionInput?: HaInput;

  public static get defaultConfig(): ConversationTrigger {
    return { trigger: "conversation", command: "" };
  }

  protected render() {
    const { command } = this.trigger;
    const commands = command ? ensureArray(command) : [];

    return html`${commands.length
        ? html`${commands.map(
              (option, index) => html`
                <ha-input
                  class="option"
                  iconTrailing
                  .index=${index}
                  .value=${option}
                  .validationMessage=${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.type.conversation.no_punctuation"
                  )}
                  auto-validate
                  validateOnInitialRender
                  pattern=${PATTERN}
                  @change=${this._updateOption}
                >
                  <ha-icon-button
                    @click=${this._removeOption}
                    slot="end"
                    .path=${mdiClose}
                  ></ha-icon-button>
                </ha-input>
              `
            )} <wa-divider></wa-divider>`
        : nothing}
      <ha-input
        class="flex-auto"
        id="option_input"
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.conversation.add_sentence"
        )}
        .validationMessage=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.conversation.no_punctuation"
        )}
        auto-validate
        pattern=${PATTERN}
        @keydown=${this._handleKeyAdd}
        @change=${this._addOption}
      >
        <ha-icon-button
          @click=${this._addOption}
          slot="end"
          .path=${mdiPlus}
        ></ha-icon-button>
      </ha-input>`;
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.key !== "Enter") {
      return;
    }
    this._addOption();
  }

  private _addOption() {
    const input = this._optionInput;
    if (!input?.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        command: this.trigger.command.length
          ? [
              ...(Array.isArray(this.trigger.command)
                ? this.trigger.command
                : [this.trigger.command]),
              input.value,
            ]
          : input.value,
      },
    });
    input.value = "";
  }

  private async _updateOption(ev: InputEvent) {
    const index = (ev.target as any).index;
    const command = [
      ...(Array.isArray(this.trigger.command)
        ? this.trigger.command
        : [this.trigger.command]),
    ];
    command.splice(index, 1, (ev.target as HaInput).value ?? "");
    fireEvent(this, "value-changed", {
      value: { ...this.trigger, command },
    });
  }

  private async _removeOption(ev: Event) {
    const index = (ev.target as any).parentElement.index;
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.conversation.delete"
        ),
        text: this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.conversation.confirm_delete"
        ),
        destructive: true,
      }))
    ) {
      return;
    }
    let command: string[] | string;
    if (!Array.isArray(this.trigger.command)) {
      command = "";
    } else {
      command = [...this.trigger.command];
      command.splice(index, 1);
    }
    fireEvent(this, "value-changed", {
      value: { ...this.trigger, command },
    });
  }

  static styles = css`
    .layout {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: flex-start;
    }
    .option {
      margin-top: 4px;
    }
    ha-input {
      margin-bottom: var(--ha-space-1);
    }
    #option_input {
      margin-top: 8px;
    }
    .header {
      margin-top: 8px;
      margin-bottom: 8px;
    }
    wa-divider {
      margin-top: var(--ha-space-2);
      margin-bottom: var(--ha-space-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-conversation": HaConversationTrigger;
  }
}
