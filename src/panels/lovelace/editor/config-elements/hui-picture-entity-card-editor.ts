import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { ActionConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import type { PictureEntityCardConfig } from "../../cards/types";
import "../../components/hui-action-editor";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EditorTarget } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    image: optional(string()),
    name: optional(string()),
    camera_image: optional(string()),
    camera_view: optional(string()),
    aspect_ratio: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    show_name: optional(boolean()),
    show_state: optional(boolean()),
    theme: optional(string()),
  })
);

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  { name: "name", selector: { text: {} } },
  { name: "image", selector: { text: {} } },
  { name: "camera_image", selector: { entity: { domain: "camera" } } },
  {
    name: "",
    type: "grid",
    schema: [
      {
        name: "camera_view",
        selector: { select: { options: ["auto", "live"] } },
      },
      { name: "aspect_ratio", selector: { text: {} } },
    ],
  },
  {
    name: "",
    type: "grid",
    schema: [
      {
        name: "show_name",
        selector: { boolean: {} },
      },
      {
        name: "show_state",
        selector: { boolean: {} },
      },
    ],
  },
  { name: "theme", selector: { theme: {} } },
] as const;

@customElement("hui-picture-entity-card-editor")
export class HuiPictureEntityCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PictureEntityCardConfig;

  public setConfig(config: PictureEntityCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _tap_action(): ActionConfig {
    return this._config!.tap_action || { action: "more-info" };
  }

  get _hold_action(): ActionConfig | undefined {
    return this._config!.hold_action;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const actions = ["more-info", "toggle", "navigate", "call-service", "none"];

    const data = {
      show_state: true,
      show_name: true,
      camera_view: "auto",
      ...this._config,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <div class="card-config">
        <hui-action-editor
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.tap_action"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .hass=${this.hass}
          .config=${this._tap_action}
          .actions=${actions}
          .configValue=${"tap_action"}
          @value-changed=${this._changed}
        ></hui-action-editor>
        <hui-action-editor
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.hold_action"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .hass=${this.hass}
          .config=${this._hold_action}
          .actions=${actions}
          .configValue=${"hold_action"}
          @value-changed=${this._changed}
        ></hui-action-editor>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _changed(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.detail.value;

    if (this[`_${target.configValue}`] === value) {
      return;
    }

    if (value !== false && !value) {
      this._config = { ...this._config };
      delete this._config[target.configValue!];
    } else {
      this._config = {
        ...this._config,
        [target.configValue!]: value,
      };
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
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
    "hui-picture-entity-card-editor": HuiPictureEntityCardEditor;
  }
}
