import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
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
import type { EmptyStateCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const buttonStruct = object({
  text: string(),
  icon: optional(string()),
  appearance: optional(enums(["accent", "filled", "outlined", "plain"])),
  variant: optional(
    enums(["brand", "neutral", "success", "warning", "danger"])
  ),
  tap_action: actionConfigStruct,
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    content_only: optional(boolean()),
    icon: optional(string()),
    icon_color: optional(string()),
    title: optional(string()),
    content: optional(string()),
    buttons: optional(array(buttonStruct)),
  })
);

@customElement("hui-empty-state-card-editor")
export class HuiEmptyStateCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EmptyStateCardConfig;

  public setConfig(config: EmptyStateCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "style",
          selector: {
            select: {
              mode: "box",
              options: (
                [
                  { value: "card", image: "card" },
                  { value: "content-only", image: "text_only" },
                ] as const
              ).map((style) => ({
                label: localize(
                  `ui.panel.lovelace.editor.card.empty_state.style_options.${style.value}`
                ),
                image: {
                  src: `/static/images/form/markdown_${style.image}.svg`,
                  src_dark: `/static/images/form/markdown_${style.image}_dark.svg`,
                  flip_rtl: true,
                },
                value: style.value,
              })),
            },
          },
        },
        { name: "icon", selector: { icon: {} } },
        {
          name: "icon_color",
          selector: {
            ui_color: {},
          },
        },
        { name: "title", selector: { text: {} } },
        { name: "content", selector: { text: { multiline: true } } },
        {
          name: "buttons",
          selector: {
            object: {
              multiple: true,
              label_field: "text",
              fields: {
                text: {
                  selector: { text: {} },
                  required: true,
                },
                icon: {
                  selector: { icon: {} },
                },
                appearance: {
                  selector: {
                    select: {
                      options: [
                        { value: "accent", label: "Accent" },
                        { value: "filled", label: "Filled" },
                        { value: "outlined", label: "Outlined" },
                        { value: "plain", label: "Plain" },
                      ],
                      mode: "dropdown",
                    },
                  },
                },
                variant: {
                  selector: {
                    select: {
                      options: [
                        { value: "brand", label: "Brand" },
                        { value: "neutral", label: "Neutral" },
                        { value: "success", label: "Success" },
                        { value: "warning", label: "Warning" },
                        { value: "danger", label: "Danger" },
                      ],
                      mode: "dropdown",
                    },
                  },
                },
                tap_action: {
                  selector: {
                    ui_action: {
                      default_action: "none",
                    },
                  },
                  required: true,
                },
              },
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      ...this._config,
      style: this._config.content_only ? "content-only" : "card",
    };

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
    const config = { ...ev.detail.value };

    if (config.style === "content-only") {
      config.content_only = true;
    } else {
      delete config.content_only;
    }
    delete config.style;

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "style":
      case "content":
      case "buttons":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.empty_state.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-empty-state-card-editor": HuiEmptyStateCardEditor;
  }
}
