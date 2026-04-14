import { mdiTextShort } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import {
  DEFAULT_NAVIGATION_PATH_INFO,
  subscribeNavigationPathInfo,
  type NavigationPathInfo,
} from "../../../../data/compute-navigation-path-info";
import type { HomeAssistant } from "../../../../types";
import { getShortcutCardDefaults } from "../../cards/hui-shortcut-card-defaults";
import type { ShortcutCardConfig } from "../../cards/types";
import {
  ACTION_RELATED_CONTEXT,
  type UiAction,
} from "../../components/hui-action-editor";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";

const actions: UiAction[] = [
  "navigate",
  "url",
  "assist",
  "perform-action",
  "none",
];

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    label: optional(string()),
    description: optional(string()),
    icon: optional(string()),
    color: optional(string()),
    vertical: optional(boolean()),
    tap_action: optional(actionConfigStruct),
  })
);

@customElement("hui-shortcut-card-editor")
export class HuiShortcutCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ShortcutCardConfig;

  private _navInfo: NavigationPathInfo = DEFAULT_NAVIGATION_PATH_INFO;

  private _unsubNavInfo?: UnsubscribeFunc;

  private _subscribedPath?: string;

  public setConfig(config: ShortcutCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._updateNavInfo();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubNavInfo?.();
    this._unsubNavInfo = undefined;
    this._subscribedPath = undefined;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has("hass") || changedProps.has("_config")) {
      this._updateNavInfo();
    }
  }

  private _updateNavInfo(): void {
    if (!this.hass) return;

    const action = this._config?.tap_action;
    const navPath =
      action?.action === "navigate" ? action.navigation_path : undefined;

    if (navPath === this._subscribedPath) return;

    this._unsubNavInfo?.();
    this._unsubNavInfo = undefined;
    this._subscribedPath = navPath;

    if (!navPath) {
      this._navInfo = DEFAULT_NAVIGATION_PATH_INFO;
      return;
    }

    this._unsubNavInfo = subscribeNavigationPathInfo(
      this.hass,
      navPath,
      (info) => {
        this._navInfo = info;
        this.requestUpdate();
      }
    );
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, label: string, icon?: string) =>
      [
        {
          name: "tap_action",
          selector: {
            ui_action: {
              default_action: "none",
              actions,
            },
          },
          context: ACTION_RELATED_CONTEXT,
        },
        {
          name: "content",
          flatten: true,
          type: "expandable",
          expanded: true,
          iconPath: mdiTextShort,
          schema: [
            {
              name: "",
              type: "grid",
              schema: [
                {
                  name: "label",
                  selector: {
                    text: { placeholder: label },
                  },
                },
                {
                  name: "description",
                  selector: { text: {} },
                },
              ],
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
            {
              name: "content_layout",
              required: true,
              selector: {
                select: {
                  mode: "box",
                  options: ["horizontal", "vertical"].map((value) => ({
                    label: localize(
                      `ui.panel.lovelace.editor.card.tile.content_layout_options.${value}`
                    ),
                    value,
                    image: {
                      src: `/static/images/form/tile_content_layout_${value}.svg`,
                      src_dark: `/static/images/form/tile_content_layout_${value}_dark.svg`,
                      flip_rtl: true,
                    },
                  })),
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
      this._navInfo
    );

    const data = {
      ...this._config,
      content_layout: this._config.vertical ? "vertical" : "horizontal",
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(
          this.hass.localize,
          defaults.label,
          defaults.icon
        )}
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

    const config = { ...ev.detail.value } as ShortcutCardConfig & {
      content_layout?: string;
    };

    if (config.content_layout) {
      config.vertical = config.content_layout === "vertical";
      delete config.content_layout;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: HaFormSchema) => {
    switch (schema.name) {
      case "label":
      case "content_layout":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.shortcut.${schema.name}`
        );
      case "description":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.shortcut.card_description"
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
    "hui-shortcut-card-editor": HuiShortcutCardEditor;
  }
}
