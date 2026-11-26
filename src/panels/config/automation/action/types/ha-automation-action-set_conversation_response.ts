import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-form/ha-form";
import type { SetConversationResponseAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import type { ActionElement } from "../ha-automation-action-row";
import { AutomationFieldErrorsController } from "../../automation-field-errors";

const SCHEMA = [
  {
    name: "set_conversation_response",
    selector: {
      template: {},
    },
  },
] as const;

@customElement("ha-automation-action-set_conversation_response")
export class HaSetConversationResponseAction
  extends LitElement
  implements ActionElement
{
  private readonly _fieldErrors = new AutomationFieldErrorsController(this, {
    inlineFields: ["set_conversation_response"],
  });

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: SetConversationResponseAction;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): SetConversationResponseAction {
    return { set_conversation_response: "" };
  }

  protected render() {
    return html`
      <ha-form
        .error=${this._fieldErrors.fields}
        .computeError=${this._fieldErrors.formError(this._computeLabelCallback)}
        .hass=${this.hass}
        .data=${this.action}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _computeLabelCallback = (): string =>
    this.hass.localize(
      "ui.panel.config.automation.editor.actions.type.set_conversation_response.label"
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-set_conversation_response": HaSetConversationResponseAction;
  }
}
