import { mdiGestureTap, mdiTextShort } from "@mdi/js";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import { NavigationPathInfoController } from "../../../../data/navigation-path-controller";
import type { HomeAssistant } from "../../../../types";
import { getShortcutCardDefaults } from "../../cards/hui-shortcut-card-defaults";
import type { ShortcutBadgeConfig } from "../../badges/types";
import type { UiAction } from "../../components/hui-action-editor";
import type { LovelaceBadgeEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceBadgeConfig } from "../structs/base-badge-struct";
import { configElementStyle } from "./config-elements-style";

const actions: UiAction[] = [
  "navigate",
  "url",
  "assist",
  "perform-action",
  "none",
];

const badgeConfigStruct = assign(
  baseLovelaceBadgeConfig,
  object({
    text: optional(string()),
    icon: optional(string()),
    color: optional(string()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
  })
);

@customElement("hui-shortcut-badge-editor")
export class HuiShortcutBadgeEditor
  extends LitElement
  implements LovelaceBadgeEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ShortcutBadgeConfig;

  private _navInfo = new NavigationPathInfoController(this);

  public setConfig(config: ShortcutBadgeConfig): void {
    assert(config, badgeConfigStruct);
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (
      (changedProps.has("hass") || changedProps.has("_config")) &&
      this.hass
    ) {
      const action = this._config?.tap_action;
      this._navInfo.update(
        this.hass,
        action?.action === "navigate" ? action.navigation_path : undefined
      );
    }
  }

  private _schema = memoizeOne(
    (text: string, icon?: string) =>
      [
        {
          name: "tap_action",
          selector: {
            ui_action: {
              default_action: "none",
              actions,
            },
          },
        },
        {
          name: "content",
          flatten: true,
          type: "expandable",
          expanded: true,
          iconPath: mdiTextShort,
          schema: [
            {
              name: "text",
              selector: {
                text: { placeholder: text },
              },
            },
            {
              name: "",
              type: "grid",
              schema: [
                {
                  name: "icon",
                  selector: {
                    icon: {
                      placeholder: icon || "mdi:link",
                    },
                  },
                },
                {
                  name: "color",
                  selector: {
                    ui_color: { default_color: "primary" },
                  },
                },
              ],
            },
          ],
        },
        {
          name: "additional_interactions",
          type: "expandable",
          flatten: true,
          iconPath: mdiGestureTap,
          schema: [
            {
              name: "hold_action",
              selector: {
                ui_action: {
                  default_action: "none",
                  actions,
                },
              },
            },
            {
              name: "double_tap_action",
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

    const defaults = getShortcutCardDefaults(
      this.hass,
      this._config.tap_action,
      this._navInfo.info
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema(defaults.label, defaults.icon)}
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
    fireEvent(this, "config-changed", {
      config: ev.detail.value as ShortcutBadgeConfig,
    });
  }

  private _computeLabelCallback = (schema: HaFormSchema) => {
    switch (schema.name) {
      case "text":
      case "additional_interactions":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.shortcut.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static styles = configElementStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shortcut-badge-editor": HuiShortcutBadgeEditor;
  }
}
