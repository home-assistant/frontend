import memoizeOne from "memoize-one";
import { mdiGestureTap } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  assert,
  assign,
  boolean,
  enums,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { STUB_IMAGE } from "../../cards/hui-picture-entity-card";
import type { PictureEntityCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    image: optional(string()),
    name: optional(string()),
    camera_image: optional(string()),
    camera_view: optional(enums(["auto", "live"])),
    aspect_ratio: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
    show_name: optional(boolean()),
    show_state: optional(boolean()),
    theme: optional(string()),
    fit_mode: optional(enums(["cover", "contain", "fill"])),
  })
);

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

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        { name: "entity", required: true, selector: { entity: {} } },
        { name: "name", selector: { text: {} } },
        { name: "image", selector: { image: {} } },
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
              schema: (["hold_action", "double_tap_action"] as const).map(
                (action) => ({
                  name: action,
                  selector: {
                    ui_action: {
                      default_action: "none" as const,
                    },
                  },
                })
              ),
            },
          ],
        },
      ] as const satisfies HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      show_state: true,
      show_name: true,
      camera_view: "auto",
      fit_mode: "cover",
      ...this._config,
    };

    const schema = this._schema(this.hass.localize);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;
    if (
      config.entity &&
      config.entity !== this._config?.entity &&
      (computeDomain(config.entity) === "image" ||
        (computeDomain(config.entity) === "person" &&
          this.hass?.states[config.entity]?.attributes.entity_picture)) &&
      config.image === STUB_IMAGE
    ) {
      delete config.image;
    }

    fireEvent(this, "config-changed", { config });
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
    "hui-picture-entity-card-editor": HuiPictureEntityCardEditor;
  }
}
