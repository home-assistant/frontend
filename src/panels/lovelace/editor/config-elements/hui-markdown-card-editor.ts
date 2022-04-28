import "../../../../components/ha-form/ha-form";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { MarkdownCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    content: string(),
    theme: optional(string()),
  })
);

const SCHEMA: HaFormSchema[] = [
  { name: "title", selector: { text: {} } },
  { name: "content", required: true, selector: { template: {} } },
  { name: "theme", selector: { theme: {} } },
];

@customElement("hui-markdown-card-editor")
export class HuiMarkdownCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: MarkdownCardConfig;

  public setConfig(config: MarkdownCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: HaFormSchema) => {
    if (schema.name === "theme") {
      return `${this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.theme"
      )} (${this.hass!.localize(
        "ui.panel.lovelace.editor.card.config.optional"
      )})`;
    }
    return (
      this.hass!.localize(
        `ui.panel.lovelace.editor.card.generic.${schema.name}`
      ) ||
      this.hass!.localize(
        `ui.panel.lovelace.editor.card.markdown.${schema.name}`
      )
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-markdown-card-editor": HuiMarkdownCardEditor;
  }
}
