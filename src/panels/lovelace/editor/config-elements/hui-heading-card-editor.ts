import { mdiGestureTap } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  assert,
  assign,
  literal,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { HeadingCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";
import { UiAction } from "../../components/hui-action-editor";
import { LocalizeFunc } from "../../../../common/translations/localize";

const actions: UiAction[] = ["navigate", "url", "perform-action", "none"];

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    heading_style: optional(union([literal("title"), literal("subtitle")])),
    heading: optional(string()),
    icon: optional(string()),
    tap_action: optional(actionConfigStruct),
  })
);

@customElement("hui-heading-card-editor")
export class HuiHeadingCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HeadingCardConfig;

  public setConfig(config: HeadingCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "heading_style",
          selector: {
            select: {
              mode: "dropdown",
              options: ["title", "subtitle"].map((value) => ({
                label: localize(
                  `ui.panel.lovelace.editor.card.heading.heading_style_options.${value}`
                ),
                value: value,
              })),
            },
          },
        },
        { name: "heading", selector: { text: {} } },
        {
          name: "icon",
          selector: {
            icon: {},
          },
        },
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
                  default_action: "none",
                  actions,
                },
              },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      ...this._config,
    };

    if (!data.heading_style) {
      data.heading_style = "title";
    }

    const schema = this._schema(this.hass.localize);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const config = ev.detail.value as HeadingCardConfig;

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "heading_style":
      case "heading":
      case "icon":
      case "interactions":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.heading.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static get styles() {
    return [
      configElementStyle,
      css`
        .container {
          display: flex;
          flex-direction: column;
        }
        ha-form {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-card-editor": HuiHeadingCardEditor;
  }
}
