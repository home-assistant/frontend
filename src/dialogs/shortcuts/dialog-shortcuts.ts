import { mdiAppleKeyboardCommand } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-alert";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-svg-icon";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { isMac } from "../../util/is_mac";

interface Text {
  type: "text";
  key: LocalizeKeys;
}

type ShortcutString = string | { key: LocalizeKeys };

interface Shortcut {
  type: "shortcut";
  shortcut: ShortcutString[];
  key: LocalizeKeys;
}

interface Section {
  key: LocalizeKeys;
  items: (Text | Shortcut)[];
}

const CTRL_CMD = "__CTRL_CMD__";

const _SHORTCUTS: Section[] = [
  {
    key: "ui.dialogs.shortcuts.searching.title",
    items: [
      { type: "text", key: "ui.dialogs.shortcuts.searching.on_any_page" },
      {
        type: "shortcut",
        shortcut: ["C"],
        key: "ui.dialogs.shortcuts.searching.search_command",
      },
      {
        type: "shortcut",
        shortcut: ["E"],
        key: "ui.dialogs.shortcuts.searching.search_entities",
      },
      {
        type: "shortcut",
        shortcut: ["D"],
        key: "ui.dialogs.shortcuts.searching.search_devices",
      },
      {
        type: "text",
        key: "ui.dialogs.shortcuts.searching.on_pages_with_tables",
      },
      {
        type: "shortcut",
        shortcut: [CTRL_CMD, "F"],
        key: "ui.dialogs.shortcuts.searching.search_in_table",
      },
    ],
  },
  {
    key: "ui.dialogs.shortcuts.assist.title",
    items: [
      {
        type: "shortcut",
        shortcut: ["A"],
        key: "ui.dialogs.shortcuts.assist.open_assist",
      },
    ],
  },
  {
    key: "ui.dialogs.shortcuts.automation_script.title",
    items: [
      {
        type: "shortcut",
        shortcut: [CTRL_CMD, "C"],
        key: "ui.dialogs.shortcuts.automation_script.copy",
      },
      {
        type: "shortcut",
        shortcut: [CTRL_CMD, "X"],
        key: "ui.dialogs.shortcuts.automation_script.cut",
      },
      {
        type: "shortcut",
        shortcut: [CTRL_CMD, "del"],
        key: "ui.dialogs.shortcuts.automation_script.delete",
      },
      {
        type: "shortcut",
        shortcut: [CTRL_CMD, "V"],
        key: "ui.dialogs.shortcuts.automation_script.paste",
      },
      {
        type: "shortcut",
        shortcut: [CTRL_CMD, "S"],
        key: "ui.dialogs.shortcuts.automation_script.save",
      },
    ],
  },
  {
    key: "ui.dialogs.shortcuts.charts.title",
    items: [
      {
        type: "shortcut",
        shortcut: [CTRL_CMD, { key: "ui.dialogs.shortcuts.shortcuts.drag" }],
        key: "ui.dialogs.shortcuts.charts.drag_to_zoom",
      },
      {
        type: "shortcut",
        shortcut: [
          CTRL_CMD,
          { key: "ui.dialogs.shortcuts.shortcuts.scroll_wheel" },
        ],
        key: "ui.dialogs.shortcuts.charts.scroll_to_zoom",
      },
      {
        type: "shortcut",
        shortcut: [{ key: "ui.dialogs.shortcuts.shortcuts.double_click" }],
        key: "ui.dialogs.shortcuts.charts.double_click",
      },
    ],
  },
  {
    key: "ui.dialogs.shortcuts.other.title",
    items: [
      {
        type: "shortcut",
        shortcut: ["M"],
        key: "ui.dialogs.shortcuts.other.my_link",
      },
    ],
  },
];

@customElement("dialog-shortcuts")
class DialogShortcuts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  public async showDialog(): Promise<void> {
    this._opened = true;
  }

  public async closeDialog(): Promise<void> {
    this._opened = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _renderShortcut(
    shortcuts: ShortcutString[],
    translationKey: LocalizeKeys
  ) {
    const keys = shortcuts.map((shortcut) =>
      typeof shortcut === "string" ? shortcut : this.hass.localize(shortcut.key)
    );

    return html`
      <div class="shortcut">
        ${keys.map(
          (key) =>
            html`<span
              >${key === CTRL_CMD
                ? isMac
                  ? html`<ha-svg-icon
                      .path=${mdiAppleKeyboardCommand}
                    ></ha-svg-icon>`
                  : this.hass.localize("ui.panel.config.automation.editor.ctrl")
                : key}</span
            >`
        )}
        ${this.hass.localize(translationKey)}
      </div>
    `;
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        defaultAction="ignore"
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.dialogs.shortcuts.title")
        )}
      >
        <div class="content">
          ${_SHORTCUTS.map(
            (section) => html`
              <h3>${this.hass.localize(section.key)}</h3>
              <div class="items">
                ${section.items.map((item) => {
                  if (item.type === "text") {
                    return html`<p>${this.hass.localize(item.key)}</p>`;
                  }
                  if (item.type === "shortcut") {
                    return this._renderShortcut(item.shortcut, item.key);
                  }
                  return nothing;
                })}
              </div>
            `
          )}
        </div>

        <ha-alert>
          ${this.hass.localize("ui.dialogs.shortcuts.enable_shortcuts_hint", {
            user_profile: html`<a href="/profile/general#shortcuts"
              >${this.hass.localize(
                "ui.dialogs.shortcuts.enable_shortcuts_hint_user_profile"
              )}</a
            >`,
          })}
        </ha-alert>
      </ha-dialog>
    `;
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --dialog-z-index: 15;
      }

      h3:first-of-type {
        margin-top: 0;
      }

      .content {
        margin-bottom: 24px;
      }

      .shortcut {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        margin: 4px 0;
      }

      span {
        padding: 8px;
        border: 1px solid var(--outline-color);
        border-radius: 8px;
      }

      .items p {
        margin-bottom: 8px;
      }

      ha-svg-icon {
        width: 12px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-shortcuts": DialogShortcuts;
  }
}
