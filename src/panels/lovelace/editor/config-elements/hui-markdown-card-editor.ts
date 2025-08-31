import { mdiGestureTap } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { MarkdownCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    text_only: optional(boolean()),
    title: optional(string()),
    content: string(),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
  })
);

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

  private _schema = memoizeOne(
    (localize: LocalizeFunc, text_only: boolean) =>
      [
        {
          name: "style",
          required: true,
          selector: {
            select: {
              mode: "box",
              options: ["card", "text-only"].map((style) => ({
                label: localize(
                  `ui.panel.lovelace.editor.card.markdown.style_options.${style}`
                ),
                image: {
                  src: `/static/images/form/markdown_${style.replace("-", "_")}.svg`,
                  src_dark: `/static/images/form/markdown_${style.replace("-", "_")}_dark.svg`,
                  flip_rtl: true,
                },
                value: style,
              })),
            },
          },
        },
        ...(!text_only
          ? ([{ name: "title", selector: { text: {} } }] as const)
          : []),
        { name: "content", required: true, selector: { template: {} } },
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
                  actions: [
                    "navigate",
                    "url",
                    "perform-action",
                    "assist",
                    "none",
                  ],
                  default_action: "none",
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
                      actions: [
                        "navigate",
                        "url",
                        "perform-action",
                        "assist",
                        "none",
                      ],
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
      ...this._config,
      style: this._config.text_only ? "text-only" : "card",
    };

    const schema = this._schema(
      this.hass.localize,
      this._config.text_only || false
    );

    const hasActions =
      (this._config?.tap_action && this._config.tap_action.action !== "none") ||
      (this._config?.hold_action &&
        this._config.hold_action.action !== "none") ||
      (this._config?.double_tap_action &&
        this._config.double_tap_action.action !== "none");

    return html`
      ${hasActions
        ? html`
            <ha-alert own-margin alert-type="info">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.card.markdown.interactions_warning"
              )}
            </ha-alert>
          `
        : nothing}
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
    const config = { ...ev.detail.value };

    if (config.style === "text-only") {
      config.text_only = true;
    } else {
      delete config.text_only;
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
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.markdown.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _computeHelperCallback = (
    _schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-markdown-card-editor": HuiMarkdownCardEditor;
  }
}
