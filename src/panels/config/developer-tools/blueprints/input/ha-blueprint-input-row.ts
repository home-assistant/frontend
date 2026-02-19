import {
  mdiArrowDown,
  mdiArrowUp,
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiGroup,
  mdiPlaylistEdit,
  mdiRenameBox,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { dump } from "js-yaml";
import { storage } from "../../../../../common/decorators/storage";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-automation-row";
import type {
  BlueprintInputSection,
  BlueprintClipboard,
  BlueprintInput,
  BlueprintInputEntry,
} from "../../../../../data/blueprint";
import {
  getInputAtPath,
  getContainingSection,
  isInputSection,
  INPUT_ICONS,
} from "../../../../../data/blueprint";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "./ha-blueprint-input-editor";
import type { BlueprintInputSidebarConfig } from "../../../../../data/automation";
import { deepEqual } from "../../../../../common/util/deep-equal";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import "../../../../../components/ha-dropdown";
import "../../../../../components/ha-dropdown-item";
import type { HaDropdownSelectEvent } from "../../../../../components/ha-dropdown";
import "@home-assistant/webawesome/dist/components/divider/divider";

@customElement("ha-blueprint-input-row")
export default class HaBlueprintInputRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public input!: [
    string,
    BlueprintInput | BlueprintInputSection | null,
  ];

  @property({ attribute: false }) public path?: string[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public highlight = false;

  @property({ type: Boolean }) public first?: boolean;

  @property({ type: Boolean }) public last?: boolean;

  @property({ type: Number }) public index!: number;

  @storage({
    key: "blueprintClipboard",
    state: false,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: BlueprintClipboard;

  @state() private _yamlMode = false;

  @state() private _warnings?: string[];

  @state() private _testing = false;

  @state() private _testingResult?: boolean;

  @state() private _selected = false;

  @state() private _openedSidebarPath: string[] = [];

  private _toggleSidebar(ev: Event) {
    ev?.stopPropagation();

    if (this._selected) {
      this._selected = false;
      fireEvent(this, "close-sidebar");
      return;
    }
    this.openSidebar(undefined);
  }

  private _pathOpened(path: string[]) {
    this._openedSidebarPath = path;
  }

  public openSidebar(path: string[] | undefined): void {
    if (!this.input[1]) {
      return;
    }

    if (this.path) {
      fireEvent(this, "open-input-group-path", this.path.concat(this.input[0]));
      return;
    }

    fireEvent(this, "open-sidebar", {
      id: this.input[0],
      config: this.input[1],
      save: this._handleChangeEvent.bind(this),
      toggleYamlMode: this._toggleYamlMode.bind(this),
      close: this._closeSidebar.bind(this),
      delete: () => {
        /* this isn't used for the blueprint input sidebar */
      },
      deleteAtPath: this._onDelete.bind(this),
      duplicate: this._onDuplicate.bind(this),
      cutAtPath: this._onCut.bind(this),
      copyAtPath: this._onCopy.bind(this),
      yamlMode: this._yamlMode,
      rename: this._renameInput.bind(this),
      pathOpened: this._pathOpened.bind(this),
      insertAfter: this._insertAfter.bind(this),
      path,
    } satisfies BlueprintInputSidebarConfig);
    this._selected = true;

    if (this.narrow) {
      window.setTimeout(() => {
        this.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }, 180);
    }
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    /*
     * If this is a section, and the input list has changed, we need to reopen
     * the sidebar. This is because when editing form elements, the HTML elements
     * have internal state, so the user can see what they're typing, even if
     * the sidebar state doesn't reflect it.
     *
     * However, the same is not true of ha-blueprint-input, so we have to update
     * the props being passed down to the sidebar.
     */
    if (
      !changedProperties ||
      !changedProperties.has("input") ||
      !changedProperties.get("input") ||
      this.path ||
      !this.input[1]
    ) {
      return;
    }

    const oldInput = changedProperties.get("input");
    if (!isInputSection(this.input[1]) || !isInputSection(oldInput[1])) {
      return;
    }

    const oldInputSection = getInputAtPath(
      oldInput[1],
      this._openedSidebarPath
    );
    const newInputSection = getInputAtPath(
      this.input[1],
      this._openedSidebarPath
    );
    if (!isInputSection(newInputSection) || !isInputSection(oldInputSection)) {
      return;
    }

    const oldKeys = Object.keys(oldInputSection.input);
    const newKeys = Object.keys(newInputSection.input);
    oldKeys.sort();
    newKeys.sort();
    if (!deepEqual(oldKeys, newKeys)) {
      this.openSidebar(this.path);
    }
  }

  protected render() {
    if (!this.input || !this.input[1]) {
      return nothing;
    }

    const icon = isInputSection(this.input[1])
      ? mdiGroup
      : INPUT_ICONS[Object.keys(this.input[1].selector!)[0]];
    const label = this.input[1]?.name || this.input[0];

    return html`
      <ha-card outlined>
        <ha-automation-row
          @click=${this._toggleSidebar}
          .highlight=${this.highlight}
        >
          <h3 slot="header">
            <ha-svg-icon class="input-icon" .path=${icon}></ha-svg-icon>
            ${label}
          </h3>

          <slot name="icons" slot="icons"></slot>

          <ha-dropdown slot="icons" @wa-select=${this._handleAction}>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            >
            </ha-icon-button>

            <ha-dropdown-item
              value="rename"
              graphic="icon"
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.rename"
              )}
              <ha-svg-icon slot="icon" .path=${mdiRenameBox}></ha-svg-icon>
            </ha-dropdown-item>

            <wa-divider></wa-divider>

            <ha-dropdown-item
              value="duplicate"
              graphic="icon"
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.developer-tools.tabs.blueprints.editor.actions.duplicate"
              )}
              <ha-svg-icon
                slot="icon"
                .path=${mdiContentDuplicate}
              ></ha-svg-icon>
            </ha-dropdown-item>

            <ha-dropdown-item
              value="copy"
              graphic="icon"
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.copy"
              )}
              <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
            </ha-dropdown-item>

            <ha-dropdown-item
              value="cut"
              graphic="icon"
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.cut"
              )}
              <ha-svg-icon slot="icon" .path=${mdiContentCut}></ha-svg-icon>
            </ha-dropdown-item>

            <ha-dropdown-item
              value="moveup"
              graphic="icon"
              .disabled=${this.disabled || this.first}
            >
              ${this.hass.localize(
                "ui.panel.config.developer-tools.tabs.blueprints.editor.move_up"
              )}
              <ha-svg-icon slot="icon" .path=${mdiArrowUp}></ha-svg-icon
            ></ha-dropdown-item>

            <ha-dropdown-item
              value="movedown"
              graphic="icon"
              .disabled=${this.disabled || this.last}
            >
              ${this.hass.localize(
                "ui.panel.config.developer-tools.tabs.blueprints.editor.move_down"
              )}
              <ha-svg-icon slot="icon" .path=${mdiArrowDown}></ha-svg-icon
            ></ha-dropdown-item>

            <ha-dropdown-item
              value="yaml"
              graphic="icon"
              .disabled=${this._warnings}
            >
              ${this.hass.localize(
                `ui.panel.config.developer-tools.tabs.blueprints.editor.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon slot="icon" .path=${mdiPlaylistEdit}></ha-svg-icon>
            </ha-dropdown-item>

            <wa-divider></wa-divider>

            <ha-dropdown-item
              variant="danger"
              value="delete"
              class="warning"
              graphic="icon"
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.developer-tools.tabs.blueprints.editor.actions.delete"
              )}
              <ha-svg-icon
                class="warning"
                slot="icon"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-dropdown-item>
          </ha-dropdown>
        </ha-automation-row>
        <div
          class="testing ${classMap({
            active: this._testing,
            pass: this._testingResult === true,
            error: this._testingResult === false,
          })}"
        >
          ${this._testingResult
            ? this.hass.localize(
                "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.testing_pass"
              )
            : this.hass.localize(
                "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.testing_error"
              )}
        </div>
      </ha-card>
    `;
  }

  private _handleChangeEvent(newValue: BlueprintInput | BlueprintInputSection) {
    fireEvent(this, "value-changed", {
      value: [this.input[0], newValue],
    });
  }

  private _toggleYamlMode() {
    if (this._yamlMode) {
      this._switchUiMode();
    } else {
      this._switchYamlMode();
    }
    this.openSidebar(undefined);
  }

  private _closeSidebar() {
    fireEvent(this, "close-sidebar");
    this._selected = false;
  }

  private async _handleAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item?.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "rename":
        await this._renameInput([]);
        break;
      case "duplicate":
        this._onDuplicate([]);
        break;
      case "copy":
        this._onCopy([]);
        break;
      case "cut":
        this._onCut([]);
        break;
      case "moveup":
        fireEvent(this, "move-up");
        break;
      case "movedown":
        fireEvent(this, "move-down");
        break;
      case "yaml":
        this._toggleYamlMode();
        break;
      case "delete":
        this._onDelete([]);
        break;
    }
  }

  private _setClipboard(path: string[] | undefined) {
    const pathExists = path && path.length > 0;
    const id = pathExists ? path[path.length - 1] : this.input[0];
    const inputAtPath = pathExists
      ? getInputAtPath(this.input[1] as BlueprintInputSection, path)
      : this.input[1];
    const input = { [id]: deepClone(inputAtPath) };
    this._clipboard = {
      ...this._clipboard,
      blueprint: { input },
    };
    copyToClipboard(dump({ blueprint: { input } }));
  }

  private _insertAfter = (
    value: BlueprintInputEntry | BlueprintInputEntry[]
  ) => {
    fireEvent(this, "insert-after", { value });
    return true;
  };

  private _onDuplicate(path: string[] | undefined) {
    fireEvent(this, "duplicate-at-path", path);
  }

  private _onCut(path: string[] | undefined) {
    this._setClipboard(path);
    if (
      !path ||
      path?.length === 0 ||
      !this.input[1] ||
      !isInputSection(this.input[1])
    ) {
      fireEvent(this, "value-changed", { value: null });
    } else {
      const value = deepClone(this.input);

      const containingSection = getContainingSection(value[1], path);
      const lastPathKey = path[path.length - 1]!;
      delete (containingSection as BlueprintInputSection).input[lastPathKey];

      fireEvent(this, "value-changed", { value });
    }
  }

  private _onCopy(path: string[] | undefined) {
    this._setClipboard(path);
  }

  private _onDelete(path: string[] | undefined): void {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.delete_confirm_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        if (!path || path.length === 0) {
          fireEvent(this, "value-changed", { value: null });
        } else {
          fireEvent(this, "value-changed-at-path", { path, value: null });
        }
      },
    });
  }

  private _switchUiMode() {
    this._warnings = undefined;
    this._yamlMode = false;
  }

  private _switchYamlMode() {
    this._warnings = undefined;
    this._yamlMode = true;
  }

  private async _renameInput(path: string[] | undefined): Promise<void> {
    if (!path || path.length === 0) {
      const id = await showPromptDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.change_id"
        ),
        inputLabel: this.hass.localize(
          "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.id"
        ),
        inputType: "string",
        placeholder: this.input[0],
        defaultValue: this.input[0],
        confirmText: this.hass.localize("ui.common.submit"),
      });
      if (!id) {
        // This shouldn't be possible
        return;
      }

      const value = [id, this.input[1]];
      fireEvent(this, "value-changed", { value });
    } else {
      const containingSection = getContainingSection(
        this.input[1] as BlueprintInputSection,
        path
      );
      const lastPathKey = path[path.length - 1]!;

      const id = await showPromptDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.change_id"
        ),
        inputLabel: this.hass.localize(
          "ui.panel.config.developer-tools.tabs.blueprints.editor.inputs.id"
        ),
        inputType: "string",
        placeholder: lastPathKey,
        defaultValue: lastPathKey,
        confirmText: this.hass.localize("ui.common.submit"),
      });
      if (!id) {
        // This shouldn't be possible
        return;
      }

      containingSection.input[id] = containingSection.input[lastPathKey];
      delete containingSection.input[lastPathKey];
      fireEvent(this, "value-changed", { value: this.input });
      this.openSidebar(path.splice(0, this.input.length - 1, id));
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-button-menu {
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        h3 {
          margin: 0;
          padding: var(--ha-space-2) 0;
          min-height: 32px;
          display: flex;
          align-items: center;
          font-size: inherit;
          font-weight: inherit;
        }
        .input-icon {
          display: none;
        }
        @media (min-width: 870px) {
          .input-icon {
            display: inline-block;
            color: var(--secondary-text-color);
            opacity: 0.9;
            margin-right: var(--ha-space-2);
            margin-inline-end: var(--ha-space-2);
            margin-inline-start: initial;
          }
        }
        .card-content {
          padding: var(--ha-space-4);
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          border-top-left-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
        }
        .testing {
          position: absolute;
          top: 0px;
          right: 0px;
          left: 0px;
          text-transform: uppercase;
          font-weight: bold;
          font-size: var(--ha-font-size-m);
          background-color: var(--divider-color, #e0e0e0);
          color: var(--text-primary-color);
          max-height: 0px;
          overflow: hidden;
          transition: max-height 0.3s;
          text-align: center;
          border-top-right-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          border-top-left-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
        }
        .testing.active {
          max-height: 100px;
        }
        .testing.error {
          background-color: var(--accent-color);
        }
        .testing.pass {
          background-color: var(--success-color);
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-input-row": HaBlueprintInputRow;
  }

  interface HASSDomEvents {
    "open-input-group-path": string[];
    "duplicate-at-path": string[] | undefined;
    "value-changed-at-path": {
      path: string[];
      value: BlueprintInput | BlueprintInputSection | null;
    };
  }
}
