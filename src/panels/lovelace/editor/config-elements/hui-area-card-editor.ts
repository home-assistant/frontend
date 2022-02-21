import "../../../../components/ha-form/ha-form";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";
import type { AreaCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { HaFormSchema } from "../../../../components/ha-form/types";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    area: optional(string()),
    navigation_path: optional(string()),
    theme: optional(string()),
    show_camera: optional(boolean()),
  })
);

@customElement("hui-area-card-editor")
export class HuiAreaCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AreaCardConfig;

  public setConfig(config: AreaCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne((): HaFormSchema[] => [
    { name: "area", selector: { area: {} } },
    { name: "show_camera", required: false, selector: { boolean: {} } },
    {
      name: "",
      type: "grid",
      schema: [
        { name: "navigation_path", required: false, selector: { text: {} } },
        { name: "theme", required: false, selector: { theme: {} } },
      ],
    },
  ]);

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema()}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: HaFormSchema) => {
    switch (schema.name) {
      case "area":
        return this.hass!.localize("ui.panel.lovelace.editor.card.area.name");
      case "navigation_path":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.action-editor.navigation_path"
        );
    }
    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.area.${schema.name}`
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-card-editor": HuiAreaCardEditor;
  }
}
