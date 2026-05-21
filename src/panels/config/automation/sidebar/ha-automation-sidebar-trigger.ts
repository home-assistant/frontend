import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume } from "@lit/context";
import {
  mdiAlert,
  mdiAppleKeyboardCommand,
  mdiCommentEditOutline,
  mdiContentCopy,
  mdiContentCut,
  mdiContentPaste,
  mdiDelete,
  mdiIdentifier,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../common/array/ensure-array";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import {
  automationConfigContext,
  type AutomationConfig,
  type LegacyTrigger,
  type Trigger,
  type TriggerList,
  type TriggerSidebarConfig,
} from "../../../../data/automation";
import {
  getTriggerDomain,
  getTriggerIds,
  getTriggerObjectId,
  isTriggerList,
} from "../../../../data/trigger";
import type { HomeAssistant } from "../../../../types";
import { isMac } from "../../../../util/is_mac";
import "../ha-automation-comment";
import "../ha-trigger-id-chip";
import { overflowStyles, sidebarEditorStyles } from "../styles";
import "../trigger/ha-automation-trigger-editor";
import type HaAutomationTriggerEditor from "../trigger/ha-automation-trigger-editor";
import "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-trigger")
export default class HaAutomationSidebarTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: TriggerSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Number, attribute: "sidebar-key" })
  public sidebarKey?: number;

  @state()
  @consume({ context: automationConfigContext, subscribe: true })
  private _automationConfig?: AutomationConfig;

  @state() private _warnings?: string[];

  @query(".sidebar-editor")
  public editor?: HaAutomationTriggerEditor;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("config")) {
      this._warnings = undefined;
      if (this.config) {
        this.yamlMode = this.config.yamlMode;
        if (this.yamlMode) {
          this.editor?.yamlEditor?.setValue(this.config.config);
        }
      }
    }
  }

  protected render() {
    const rowDisabled =
      "enabled" in this.config.config && this.config.config.enabled === false;
    const type = isTriggerList(this.config.config)
      ? "list"
      : this.config.config.trigger;

    const subtitle = this.hass.localize(
      "ui.panel.config.automation.editor.triggers.trigger"
    );

    const domain =
      "trigger" in this.config.config &&
      getTriggerDomain(this.config.config.trigger);
    const triggerName =
      "trigger" in this.config.config &&
      getTriggerObjectId(this.config.config.trigger);

    const title =
      this.hass.localize(
        `ui.panel.config.automation.editor.triggers.type.${type as LegacyTrigger["trigger"]}.label`
      ) ||
      this.hass.localize(`component.${domain}.triggers.${triggerName}.name`);

    const duplicatedId = this._isDuplicateId(
      "id" in this.config.config ? this.config.config.id : undefined,
      this._automationConfig?.triggers
    );

    return html`
      <ha-automation-sidebar-card
        .hass=${this.hass}
        .isWide=${this.isWide}
        .yamlMode=${this.yamlMode}
        .warnings=${this._warnings}
        .narrow=${this.narrow}
        @wa-select=${this._handleDropdownSelect}
      >
        <span slot="title">${title}</span>
        <div slot="subtitle" class="subtitle">
          ${subtitle}
          ${"id" in this.config.config
            ? html`<ha-trigger-id-chip
                  id="trigger-id-chip"
                  .warning=${duplicatedId}
                  .triggerId=${(
                    this.config.config as Exclude<Trigger, TriggerList>
                  ).id}
                >
                  ${duplicatedId
                    ? html`<ha-svg-icon
                        slot="start"
                        .path=${mdiAlert}
                      ></ha-svg-icon>`
                    : nothing}
                </ha-trigger-id-chip>
                ${duplicatedId
                  ? html`<ha-tooltip for="trigger-id-chip">
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.triggers.duplicate_id_warning"
                      )}
                    </ha-tooltip>`
                  : nothing} `
            : nothing}
          ${rowDisabled
            ? `(${this.hass.localize("ui.panel.config.automation.editor.actions.disabled")})`
            : nothing}
        </div>
        <ha-dropdown-item
          slot="menu-items"
          value="rename"
          .disabled=${this.disabled || type === "list"}
        >
          <ha-svg-icon slot="icon" .path=${mdiRenameBox}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.rename"
            )}
            <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
          </div>
        </ha-dropdown-item>
        ${type !== "list"
          ? html`<ha-dropdown-item
              slot="menu-items"
              value="edit_comment"
              .disabled=${this.disabled}
            >
              <ha-svg-icon
                slot="icon"
                .path=${mdiCommentEditOutline}
              ></ha-svg-icon>
              <div class="overflow-label">
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.comment.${(this.config.config as Exclude<Trigger, TriggerList>).comment ? "edit" : "add"}`
                )}
                <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
              </div>
            </ha-dropdown-item>`
          : nothing}
        ${type !== "list"
          ? html` <ha-dropdown-item
              slot="menu-items"
              value="edit_id"
              .disabled=${this.disabled || type === "list"}
            >
              <ha-svg-icon slot="icon" .path=${mdiIdentifier}></ha-svg-icon>
              <div class="overflow-label">
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.triggers.${"id" in this.config.config ? "edit" : "add"}_id`
                )}
                <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
              </div>
            </ha-dropdown-item>`
          : nothing}

        <wa-divider slot="menu-items"></wa-divider>

        <ha-dropdown-item
          slot="menu-items"
          value="duplicate"
          .disabled=${this.disabled}
        >
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.duplicate"
          )}
          <ha-svg-icon
            slot="icon"
            .path=${mdiPlusCircleMultipleOutline}
          ></ha-svg-icon>
        </ha-dropdown-item>

        <ha-dropdown-item slot="menu-items" value="copy">
          <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.copy"
            )}
            ${!this.narrow
              ? html`<span class="shortcut">
                  <span
                    >${isMac
                      ? html`<ha-svg-icon
                          .path=${mdiAppleKeyboardCommand}
                        ></ha-svg-icon>`
                      : this.hass.localize(
                          "ui.panel.config.automation.editor.ctrl"
                        )}</span
                  >
                  <span>+</span>
                  <span>C</span>
                </span>`
              : nothing}
          </div>
        </ha-dropdown-item>

        <ha-dropdown-item
          slot="menu-items"
          value="cut"
          .disabled=${this.disabled}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentCut}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.cut"
            )}
            ${!this.narrow
              ? html`<span class="shortcut">
                  <span
                    >${isMac
                      ? html`<ha-svg-icon
                          .path=${mdiAppleKeyboardCommand}
                        ></ha-svg-icon>`
                      : this.hass.localize(
                          "ui.panel.config.automation.editor.ctrl"
                        )}</span
                  >
                  <span>+</span>
                  <span>X</span>
                </span>`
              : nothing}
          </div>
        </ha-dropdown-item>
        ${this.config.pasteAvailable()
          ? html`
              <ha-dropdown-item
                slot="menu-items"
                value="paste"
                .disabled=${this.disabled}
              >
                <ha-svg-icon slot="icon" .path=${mdiContentPaste}></ha-svg-icon>
                <div class="overflow-label">
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.paste"
                  )}
                  ${!this.narrow
                    ? html`<span class="shortcut">
                        <span
                          >${isMac
                            ? html`<ha-svg-icon
                                .path=${mdiAppleKeyboardCommand}
                              ></ha-svg-icon>`
                            : this.hass.localize(
                                "ui.panel.config.automation.editor.ctrl"
                              )}</span
                        >
                        <span>+</span>
                        <span>V</span>
                      </span>`
                    : nothing}
                </div>
              </ha-dropdown-item>
            `
          : nothing}
        <ha-dropdown-item
          slot="menu-items"
          value="toggle_yaml_mode"
          .disabled=${!this.config.uiSupported || !!this._warnings}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlaylistEdit}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              `ui.panel.config.automation.editor.edit_${!this.yamlMode ? "yaml" : "ui"}`
            )}
            <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
          </div>
        </ha-dropdown-item>
        <wa-divider slot="menu-items"></wa-divider>
        <ha-dropdown-item
          slot="menu-items"
          value="disable"
          .disabled=${this.disabled || type === "list"}
        >
          <ha-svg-icon
            slot="icon"
            .path=${rowDisabled ? mdiPlayCircleOutline : mdiStopCircleOutline}
          ></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              `ui.panel.config.automation.editor.actions.${rowDisabled ? "enable" : "disable"}`
            )}
            <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
          </div>
        </ha-dropdown-item>
        <ha-dropdown-item
          slot="menu-items"
          value="delete"
          .disabled=${this.disabled}
          variant="danger"
        >
          <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
          <div class="overflow-label">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.actions.delete"
            )}
            ${!this.narrow
              ? html`<span class="shortcut">
                  <span
                    >${isMac
                      ? html`<ha-svg-icon
                          .path=${mdiAppleKeyboardCommand}
                        ></ha-svg-icon>`
                      : this.hass.localize(
                          "ui.panel.config.automation.editor.ctrl"
                        )}</span
                  >
                  <span>+</span>
                  <span
                    >${this.hass.localize(
                      "ui.panel.config.automation.editor.del"
                    )}</span
                  >
                </span>`
              : nothing}
          </div>
        </ha-dropdown-item>
        ${keyed(
          this.sidebarKey,
          html`<ha-automation-trigger-editor
            class="sidebar-editor"
            .hass=${this.hass}
            .trigger=${this.config.config}
            .description=${this.config.description}
            @value-changed=${this._valueChangedSidebar}
            @yaml-changed=${this._yamlChangedSidebar}
            .uiSupported=${this.config.uiSupported}
            .yamlMode=${this.yamlMode}
            .disabled=${this.disabled}
            @ui-mode-not-available=${this._handleUiModeNotAvailable}
            sidebar
          ></ha-automation-trigger-editor>`
        )}
        ${!isTriggerList(this.config.config) &&
        this.config.config.comment?.trim() &&
        !this.yamlMode
          ? html`<ha-automation-comment
              @edit-comment=${this.config.editComment}
              .comment=${this.config.config.comment}
            ></ha-automation-comment>`
          : nothing}
      </ha-automation-sidebar-card>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this.yamlMode) {
      this.yamlMode = true;
    }
  }

  private _isDuplicateId = memoizeOne(
    (id: string | undefined, triggers: Trigger | Trigger[] | undefined) => {
      if (!id || !triggers) {
        return false;
      }
      const triggerIds = getTriggerIds(ensureArray(triggers));
      return triggerIds.filter((triggerId) => triggerId === id).length > 1;
    }
  );

  private _valueChangedSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    this.config?.save?.(ev.detail.value);

    if (this.config) {
      fireEvent(this, "value-changed", {
        value: {
          ...this.config,
          config: ev.detail.value,
        },
      });
    }
  }

  private _yamlChangedSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    this.config?.save?.(ev.detail.value);
  }

  private _toggleYamlMode = () => {
    fireEvent(this, "toggle-yaml-mode");
  };

  private _handleDropdownSelect(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item?.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "rename":
        this.config.rename();
        break;
      case "edit_comment":
        this.config.editComment();
        break;
      case "edit_id":
        this.config.editId();
        break;
      case "duplicate":
        this.config.duplicate();
        break;
      case "copy":
        this.config.copy();
        break;
      case "cut":
        this.config.cut();
        break;
      case "paste":
        this.config.paste();
        break;
      case "toggle_yaml_mode":
        this._toggleYamlMode();
        break;
      case "disable":
        this.config.disable();
        break;
      case "delete":
        this.config.delete();
        break;
    }
  }

  static styles = [
    sidebarEditorStyles,
    overflowStyles,
    css`
      .subtitle {
        display: flex;
        gap: var(--ha-space-1);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-trigger": HaAutomationSidebarTrigger;
  }
}
