import type { HassEntity } from "home-assistant-js-websocket";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { domainIcon } from "../../../../common/entity/domain_icon";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { ButtonCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    show_name: optional(boolean()),
    icon: optional(string()),
    show_icon: optional(boolean()),
    icon_height: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    theme: optional(string()),
    show_state: optional(boolean()),
  })
);

@customElement("hui-button-card-editor")
export class HuiButtonCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ButtonCardConfig;

  public setConfig(config: ButtonCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (entity?: string, icon?: string, entityState?: HassEntity) =>
      [
        { name: "entity", selector: { entity: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            { name: "name", selector: { text: {} } },
            {
              name: "icon",
              selector: {
                icon: {
                  placeholder: icon || entityState?.attributes.icon,
                  fallbackPath:
                    !icon &&
                    !entityState?.attributes.icon &&
                    entityState &&
                    entity
                      ? domainIcon(computeDomain(entity), entityState)
                      : undefined,
                },
              },
            },
          ],
        },
        {
          name: "",
          type: "grid",
          column_min_width: "100px",
          schema: [
            { name: "show_name", selector: { boolean: {} } },
            { name: "show_state", selector: { boolean: {} } },
            { name: "show_icon", selector: { boolean: {} } },
          ],
        },
        {
          name: "",
          type: "grid",
          schema: [
            { name: "icon_height", selector: { text: { suffix: "px" } } },
            { name: "theme", selector: { theme: {} } },
          ],
        },
        {
          name: "tap_action",
          selector: { "ui-action": {} },
        },
        {
          name: "hold_action",
          selector: { "ui-action": {} },
        },
      ] as const
  );

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const entityState = this._config.entity
      ? this.hass.states[this._config.entity]
      : undefined;

    const schema = this._schema(
      this._config.entity,
      this._config.icon,
      entityState
    );

    const data = {
      show_name: true,
      show_icon: true,
      ...this._config,
    };

    if (data.icon_height?.includes("px")) {
      data.icon_height = String(parseFloat(data.icon_height));
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;

    if (config.icon_height && !config.icon_height.endsWith("px")) {
      config.icon_height += "px";
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "tap_action":
      case "hold_action":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.button.default_action_help"
        );
      default:
        return undefined;
    }
  };

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "theme":
      case "tap_action":
      case "hold_action":
        return `${this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static styles: CSSResultGroup = configElementStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card-editor": HuiButtonCardEditor;
  }
}
