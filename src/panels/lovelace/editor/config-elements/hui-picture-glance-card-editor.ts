import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { array, assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { ActionConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import type { PictureGlanceCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import type { EntityConfig } from "../../entity-rows/types";
import type { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    entity: optional(string()),
    image: optional(string()),
    image_entity: optional(string()),
    camera_image: optional(string()),
    camera_view: optional(string()),
    aspect_ratio: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    entities: array(entitiesConfigStruct),
    theme: optional(string()),
  })
);

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "image", selector: { text: {} } },
  { name: "image_entity", selector: { entity: { domain: "image" } } },
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
  { name: "entity", selector: { entity: {} } },
  { name: "theme", selector: { theme: {} } },
  {
    name: "tap_action",
    selector: { ui_action: {} },
  },
  {
    name: "hold_action",
    selector: { ui_action: {} },
  },
] as const;

@customElement("hui-picture-glance-card-editor")
export class HuiPictureGlanceCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PictureGlanceCardConfig;

  @state() private _configEntities?: EntityConfig[];

  public setConfig(config: PictureGlanceCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  get _tap_action(): ActionConfig {
    return this._config!.tap_action || { action: "toggle" };
  }

  get _hold_action(): ActionConfig {
    return this._config!.hold_action || { action: "more-info" };
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = { camera_view: "auto", ...this._config };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <div class="card-config">
        <hui-entity-editor
          .hass=${this.hass}
          .entities=${this._configEntities}
          @entities-changed=${this._changed}
        ></hui-entity-editor>
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
    if (ev.detail && ev.detail.entities) {
      this._config = { ...this._config, entities: ev.detail.entities };

      this._configEntities = processEditorEntities(this._config.entities);
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "theme":
      case "tap_action":
      case "hold_action":
        return `${this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "entity":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.picture-glance.state_entity"
        );
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
    "hui-picture-glance-card-editor": HuiPictureGlanceCardEditor;
  }
}
