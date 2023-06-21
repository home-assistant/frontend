import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { IframeCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    url: optional(string()),
    aspect_ratio: optional(string()),
    allow_open_top_navigation: optional(boolean()),
  })
);

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  {
    name: "",
    type: "grid",
    schema: [
      { name: "url", required: true, selector: { text: {} } },
      { name: "aspect_ratio", selector: { text: {} } },
    ],
  },
] as const;

@customElement("hui-iframe-card-editor")
export class HuiIframeCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: IframeCardConfig;

  public setConfig(config: IframeCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
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

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-iframe-card-editor": HuiIframeCardEditor;
  }
}
