import { mdiGestureTap } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  enums,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
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
    camera_view: optional(enums(["auto", "live"])),
    aspect_ratio: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    entities: array(entitiesConfigStruct),
    theme: optional(string()),
    fit_mode: optional(enums(["cover", "contain", "fill"])),
  })
);

@customElement("hui-picture-glance-card-editor")
export class HuiPictureGlanceCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PictureGlanceCardConfig;

  @state() private _configEntities?: EntityConfig[];

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "title", selector: { text: {} } },
        { name: "image", selector: { image: {} } },
        {
          name: "image_entity",
          selector: { entity: { domain: ["image", "person"] } },
        },
        { name: "camera_image", selector: { entity: { domain: "camera" } } },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "camera_view",
              required: true,
              selector: {
                select: {
                  options: ["auto", "live"].map((value) => ({
                    value,
                    label: localize(
                      `ui.panel.lovelace.editor.card.generic.camera_view_options.${value}`
                    ),
                  })),
                  mode: "dropdown",
                },
              },
            },
            {
              name: "fit_mode",
              required: true,
              selector: {
                select: {
                  options: ["cover", "contain", "fill"].map((value) => ({
                    value,
                    label: localize(
                      `ui.panel.lovelace.editor.card.generic.fit_mode_options.${value}`
                    ),
                  })),
                  mode: "dropdown",
                },
              },
            },
            { name: "aspect_ratio", selector: { text: {} } },
          ],
        },
        { name: "entity", selector: { entity: {} } },
        { name: "theme", selector: { theme: {} } },
        {
          name: "interactions",
          type: "expandable",
          flatten: true,
          iconPath: mdiGestureTap,
          schema: [
            {
              name: "tap_action",
              selector: {
                ui_action: {
                  default_action: "more-info",
                },
              },
            },
            {
              name: "",
              type: "optional_actions",
              flatten: true,
              schema: [
                {
                  name: "hold_action",
                  selector: {
                    ui_action: {
                      default_action: "none",
                    },
                  },
                },
                {
                  name: "double_tap_action",
                  selector: {
                    ui_action: {
                      default_action: "none",
                    },
                  },
                },
              ],
            },
          ],
        },
      ] as const satisfies HaFormSchema[]
  );

  public setConfig(config: PictureGlanceCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = { camera_view: "auto", fit_mode: "cover", ...this._config };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
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

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "theme":
      case "tap_action":
      case "hold_action":
      case "double_tap_action":
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

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "aspect_ratio":
        return typeof this._config?.grid_options?.rows === "number"
          ? this.hass!.localize(
              `ui.panel.lovelace.editor.card.generic.aspect_ratio_ignored`
            )
          : "";
      default:
        return "";
    }
  };

  static styles: CSSResultGroup = configElementStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-glance-card-editor": HuiPictureGlanceCardEditor;
  }
}
