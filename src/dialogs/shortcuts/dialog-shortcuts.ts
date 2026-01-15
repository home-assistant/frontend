import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-alert";
import "../../components/ha-svg-icon";
import "../../components/ha-wa-dialog";
import type { HomeAssistant } from "../../types";
import { isMac } from "../../util/is_mac";

interface Text {
  textTranslationKey: LocalizeKeys;
}

interface LocalizedShortcut {
  shortcutTranslationKey: LocalizeKeys;
}

type ShortcutString = string | LocalizedShortcut;

interface Shortcut {
  shortcut: ShortcutString[];
  descriptionTranslationKey: LocalizeKeys;
}

interface Section {
  titleTranslationKey: LocalizeKeys;
  items: (Text | Shortcut)[];
}

const CTRL_CMD = "__CTRL_CMD__";

const _SHORTCUTS: Section[] = [
  {
    titleTranslationKey: "ui.dialogs.shortcuts.searching.title",
    items: [
      {
        textTranslationKey: "ui.dialogs.shortcuts.searching.on_any_page",
      },
      {
        shortcut: [CTRL_CMD, "K"],
        descriptionTranslationKey: "ui.dialogs.shortcuts.searching.search",
      },
      {
        shortcut: ["C"],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.searching.search_command",
      },
      {
        shortcut: ["E"],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.searching.search_entities",
      },
      {
        shortcut: ["D"],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.searching.search_devices",
      },
      {
        textTranslationKey:
          "ui.dialogs.shortcuts.searching.on_pages_with_tables",
      },
      {
        shortcut: [CTRL_CMD, "F"],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.searching.search_in_table",
      },
    ],
  },
  {
    titleTranslationKey: "ui.dialogs.shortcuts.assist.title",
    items: [
      {
        shortcut: ["A"],
        descriptionTranslationKey: "ui.dialogs.shortcuts.assist.open_assist",
      },
    ],
  },
  {
    titleTranslationKey: "ui.dialogs.shortcuts.automation_script.title",
    items: [
      {
        shortcut: [CTRL_CMD, "C"],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.automation_script.copy",
      },
      {
        shortcut: [CTRL_CMD, "X"],
        descriptionTranslationKey: "ui.dialogs.shortcuts.automation_script.cut",
      },
      {
        shortcut: [
          CTRL_CMD,
          { shortcutTranslationKey: "ui.dialogs.shortcuts.keys.del" },
        ],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.automation_script.delete",
      },
      {
        shortcut: [CTRL_CMD, "V"],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.automation_script.paste",
      },
      {
        shortcut: [CTRL_CMD, "S"],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.automation_script.save",
      },
      {
        shortcut: [CTRL_CMD, "Z"],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.automation_script.undo",
      },
      {
        shortcut: [CTRL_CMD, "Y"],
        descriptionTranslationKey:
          "ui.dialogs.shortcuts.automation_script.redo",
      },
    ],
  },
  {
    titleTranslationKey: "ui.dialogs.shortcuts.charts.title",
    items: [
      {
        shortcut: [
          CTRL_CMD,
          { shortcutTranslationKey: "ui.dialogs.shortcuts.shortcuts.drag" },
        ],
        descriptionTranslationKey: "ui.dialogs.shortcuts.charts.drag_to_zoom",
      },
      {
        shortcut: [
          CTRL_CMD,
          {
            shortcutTranslationKey:
              "ui.dialogs.shortcuts.shortcuts.scroll_wheel",
          },
        ],
        descriptionTranslationKey: "ui.dialogs.shortcuts.charts.scroll_to_zoom",
      },
      {
        shortcut: [
          {
            shortcutTranslationKey:
              "ui.dialogs.shortcuts.shortcuts.double_click",
          },
        ],
        descriptionTranslationKey: "ui.dialogs.shortcuts.charts.double_click",
      },
    ],
  },
  {
    titleTranslationKey: "ui.dialogs.shortcuts.other.title",
    items: [
      {
        shortcut: ["M"],
        descriptionTranslationKey: "ui.dialogs.shortcuts.other.my_link",
      },
      {
        shortcut: ["Shift", "/"],
        descriptionTranslationKey: "ui.dialogs.shortcuts.other.show_shortcuts",
      },
    ],
  },
];

@customElement("dialog-shortcuts")
class DialogShortcuts extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  public async showDialog(): Promise<void> {
    this._open = true;
  }

  private _dialogClosed() {
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public async closeDialog() {
    this._open = false;
    return true;
  }

  private _renderShortcut(
    shortcutKeys: ShortcutString[],
    descriptionKey: LocalizeKeys
  ) {
    return html`
      <div class="shortcut">
        ${shortcutKeys.map(
          (shortcutKey) =>
            html`<span
              >${shortcutKey === CTRL_CMD
                ? isMac
                  ? "⌘"
                  : this.hass.localize("ui.panel.config.automation.editor.ctrl")
                : typeof shortcutKey === "string"
                  ? shortcutKey
                  : this.hass.localize(
                      shortcutKey.shortcutTranslationKey
                    )}</span
            >`
        )}
        ${this.hass.localize(descriptionKey)}
      </div>
    `;
  }

  protected render() {
    return html`
      <ha-wa-dialog
        .open=${this._open}
        @closed=${this._dialogClosed}
        .headerTitle=${this.hass.localize("ui.dialogs.shortcuts.title")}
      >
        <div class="content">
          ${_SHORTCUTS.map(
            (section) => html`
              <h3>${this.hass.localize(section.titleTranslationKey)}</h3>
              <div class="items">
                ${section.items.map((item) => {
                  if ("shortcut" in item) {
                    return this._renderShortcut(
                      (item as Shortcut).shortcut,
                      (item as Shortcut).descriptionTranslationKey
                    );
                  }
                  return html`<p>
                    ${this.hass.localize((item as Text).textTranslationKey)}
                  </p>`;
                })}
              </div>
            `
          )}
        </div>

        <ha-alert slot="footer">
          ${this.hass.localize("ui.dialogs.shortcuts.enable_shortcuts_hint", {
            user_profile: html`<a href="/profile/general#shortcuts"
              >${this.hass.localize(
                "ui.dialogs.shortcuts.enable_shortcuts_hint_user_profile"
              )}</a
            >`,
          })}
        </ha-alert>
      </ha-wa-dialog>
    `;
  }

  static styles = [
    css`
      .shortcut {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--ha-space-2);
        margin: 4px 0;
      }

      span {
        padding: 8px;
        border: 1px solid var(--outline-color);
        border-radius: var(--ha-border-radius-md);
      }

      .items p {
        margin-bottom: 8px;
      }

      ha-svg-icon {
        width: 12px;
      }

      ha-alert a {
        color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-shortcuts": DialogShortcuts;
  }
}
