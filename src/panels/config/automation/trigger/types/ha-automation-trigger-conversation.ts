import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import type { HaTextField } from "../../../../../components/ha-textfield";
import { ConversationTrigger } from "../../../../../data/automation";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../../../types";
import { TriggerElement } from "../ha-automation-trigger-row";

const PATTERN = "^[^.。,，?¿？؟!！;；:：]+$";

@customElement("ha-automation-trigger-conversation")
export class HaConversationTrigger
  extends LitElement
  implements TriggerElement
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: ConversationTrigger;

  @property({ type: Boolean }) public disabled = false;

  @query("#option_input", true) private _optionInput?: HaTextField;

  public static get defaultConfig(): Omit<ConversationTrigger, "platform"> {
    return { command: "" };
  }

  protected render() {
    const { command } = this.trigger;
    const commands = command ? ensureArray(command) : [];

    return html`${commands.length
        ? commands.map(
            (option, index) => html`
              <ha-textfield
                class="option"
                iconTrailing
                .index=${index}
                .value=${option}
                .validationMessage=${this.hass.localize(
                  "ui.panel.config.automation.editor.triggers.type.conversation.no_punctuation"
                )}
                autoValidate
                validateOnInitialRender
                pattern=${PATTERN}
                @change=${this._updateOption}
              >
                <ha-icon-button
                  @click=${this._removeOption}
                  slot="trailingIcon"
                  .path=${mdiClose}
                ></ha-icon-button>
              </ha-textfield>
            `
          )
        : nothing}
      <ha-textfield
        class="flex-auto"
        id="option_input"
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.conversation.add_sentence"
        )}
        .validationMessage=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.conversation.no_punctuation"
        )}
        autoValidate
        pattern=${PATTERN}
        @keydown=${this._handleKeyAdd}
        @change=${this._addOption}
      ></ha-textfield>`;
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

  private async _updateOption(ev: Event) {
    const index = (ev.target as any).index;
    const command = [
      ...(Array.isArray(this.trigger.command)
        ? this.trigger.command
        : [this.trigger.command]),
    ];
    command.splice(index, 1, (ev.target as HaTextField).value);
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

  static get styles(): CSSResultGroup {
    return css`
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
      mwc-button {
        margin-left: 8px;
      }
      ha-textfield {
        display: block;
        margin-bottom: 8px;
        --textfield-icon-trailing-padding: 0;
      }
      ha-textfield > ha-icon-button {
        position: relative;
        right: -8px;
        --mdc-icon-button-size: 36px;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        inset-inline-start: initial;
        inset-inline-end: -8px;
        direction: var(--direction);
      }
      #option_input {
        margin-top: 8px;
      }
      .header {
        margin-top: 8px;
        margin-bottom: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-conversation": HaConversationTrigger;
  }
}
