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
                  ? html`<ha-svg-icon
                      .path=${mdiAppleKeyboardCommand}
                    ></ha-svg-icon>`
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
        border-radius: var(--ha-border-radius-md);
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
