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
import type { EmptyStateCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    content_only: optional(boolean()),
    icon: optional(string()),
    title: optional(string()),
    content: optional(string()),
    action_label: optional(string()),
    tap_action: optional(actionConfigStruct),
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
        { name: "title", selector: { text: {} } },
        { name: "content", selector: { text: { multiline: true } } },
        {
          name: "interactions",
          type: "expandable",
          flatten: true,
          iconPath: mdiGestureTap,
          schema: [
            { name: "action_label", selector: { text: {} } },
            {
              name: "tap_action",
              selector: {
                ui_action: {
                  default_action: "none",
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
      case "action_label":
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
