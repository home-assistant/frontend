import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { WaitAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import type { ActionElement } from "../ha-automation-action-row";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

const SCHEMA = [
  {
    name: "wait_template",
    selector: {
      template: {},
    },
  },
  {
    name: "timeout",
    required: false,
    selector: {
      text: {},
    },
  },
  {
    name: "continue_on_timeout",
    selector: { boolean: {} },
  },
] as const;

@customElement("ha-automation-action-wait_template")
export class HaWaitAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: WaitAction;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig() {
    return { wait_template: "", continue_on_timeout: true };
  }

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.action}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.actions.type.wait_template.${
        schema.name === "continue_on_timeout" ? "continue_timeout" : schema.name
      }`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-wait_template": HaWaitAction;
  }
}
