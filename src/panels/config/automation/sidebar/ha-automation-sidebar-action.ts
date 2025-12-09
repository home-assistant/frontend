import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiAppleKeyboardCommand,
  mdiContentCopy,
  mdiContentCut,
  mdiDelete,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiPlusCircleMultipleOutline,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../../../components/ha-dropdown-item";
import { ACTION_BUILDING_BLOCKS } from "../../../../data/action";
import type { ActionSidebarConfig } from "../../../../data/automation";
import { domainToName } from "../../../../data/integration";
import type { RepeatAction, ServiceAction } from "../../../../data/script";
import type { HomeAssistant } from "../../../../types";
import { isMac } from "../../../../util/is_mac";
import type HaAutomationConditionEditor from "../action/ha-automation-action-editor";
import { getAutomationActionType } from "../action/ha-automation-action-row";
import { getRepeatType } from "../action/types/ha-automation-action-repeat";
import { overflowStyles, sidebarEditorStyles } from "../styles";
import "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-action")
export default class HaAutomationSidebarAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: ActionSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Number, attribute: "sidebar-key" })
  public sidebarKey?: number;

  @state() private _warnings?: string[];

  @query(".sidebar-editor")
  public editor?: HaAutomationConditionEditor;

  protected willUpdate(changedProperties) {
    if (changedProperties.has("config")) {
      this._warnings = undefined;
      if (this.config) {
        this.yamlMode = this.config.yamlMode;
        if (this.yamlMode) {
          this.editor?.yamlEditor?.setValue(this.config.config.action);
        }
      }
    }
  }

  protected render() {
    const actionConfig = this.config.config.action;

    const rowDisabled =
      "enabled" in actionConfig && actionConfig.enabled === false;

    const actionType = getAutomationActionType(actionConfig);

    const type =
      actionType !== "repeat"
        ? actionType
        : `repeat_${getRepeatType((actionConfig as RepeatAction).repeat)}`;

    const isBuildingBlock = ACTION_BUILDING_BLOCKS.includes(type || "");

    const subtitle = this.hass.localize(
      "ui.panel.config.automation.editor.actions.action"
    );

    let title =
      this.hass.localize(
        `ui.panel.config.automation.editor.actions.type.${type}.label` as LocalizeKeys
      ) || type;

    if (type === "service" && (actionConfig as ServiceAction).action) {
      const [domain, service] = (actionConfig as ServiceAction).action!.split(
        ".",
        2
      );

      title = `${domainToName(this.hass.localize, domain)}: ${
        this.hass.localize(
          `component.${domain}.services.${service}.name`,
          this.hass.services[domain]?.[service]?.description_placeholders
        ) ||
        this.hass.services[domain]?.[service]?.name ||
        title
      }`;
    }

    const description = isBuildingBlock
      ? this.hass.localize(
          `ui.panel.config.automation.editor.actions.type.${type}.description.picker` as LocalizeKeys
        )
      : "";

    return html`<ha-automation-sidebar-card
      .hass=${this.hass}
      .isWide=${this.isWide}
      .yamlMode=${this.yamlMode}
      .warnings=${this._warnings}
      .narrow=${this.narrow}
      @wa-select=${this._handleDropdownSelect}
    >
      <span slot="title">${title}</span>
      <span slot="subtitle"
        >${subtitle}${rowDisabled
          ? html` (${this.hass.localize(
              "ui.panel.config.automation.editor.actions.disabled"
            )})`
          : ""}</span
      >

      <ha-dropdown-item slot="menu-items" value="run">
        <ha-svg-icon slot="icon" .path=${mdiPlay}></ha-svg-icon>
        <div class="overflow-label">
          ${this.hass.localize("ui.panel.config.automation.editor.actions.run")}
          <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
        </div>
      </ha-dropdown-item>
      <ha-dropdown-item
        slot="menu-items"
        value="rename"
        .disabled=${this.disabled}
      >
        <ha-svg-icon slot="icon" .path=${mdiRenameBox}></ha-svg-icon>
        <div class="overflow-label">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.rename"
          )}
          <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
        </div>
      </ha-dropdown-item>

      <wa-divider slot="menu-items"></wa-divider>
      <ha-dropdown-item
        slot="menu-items"
        value="duplicate"
        .disabled=${this.disabled}
      >
        <ha-svg-icon
          slot="icon"
          .path=${mdiPlusCircleMultipleOutline}
        ></ha-svg-icon>
        <div class="overflow-label">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.duplicate"
          )}
          <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
        </div>
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
        .disabled=${this.disabled}
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
        variant="danger"
        .disabled=${this.disabled}
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
      ${description && !this.yamlMode
        ? html`<div class="description">${description}</div>`
        : keyed(
            this.sidebarKey,
            html`<ha-automation-action-editor
              class="sidebar-editor"
              .hass=${this.hass}
              .action=${actionConfig}
              .yamlMode=${this.yamlMode}
              .uiSupported=${this.config.uiSupported}
              @value-changed=${this._valueChangedSidebar}
              @yaml-changed=${this._yamlChangedSidebar}
              sidebar
              narrow
              .disabled=${this.disabled}
              @ui-mode-not-available=${this._handleUiModeNotAvailable}
            ></ha-automation-action-editor>`
          )}
    </ha-automation-sidebar-card>`;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this.yamlMode) {
      this.yamlMode = true;
    }
  }

  private _valueChangedSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    this.config?.save?.(ev.detail.value);

    if (this.config) {
      fireEvent(this, "value-changed", {
        value: {
          ...this.config,
          config: {
            action: ev.detail.value,
          },
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

  private _handleDropdownSelect(ev: CustomEvent<{ item: HaDropdownItem }>) {
    const action = ev.detail?.item?.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "rename":
        this.config.rename();
        break;
      case "run":
        this.config.run();
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

  static styles = [sidebarEditorStyles, overflowStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-action": HaAutomationSidebarAction;
  }
}
