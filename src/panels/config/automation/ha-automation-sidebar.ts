import {
  mdiClose,
  mdiDelete,
  mdiDotsVertical,
  mdiIdentifier,
  mdiPlayCircleOutline,
  mdiPlaylistEdit,
  mdiRenameBox,
  mdiStopCircleOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import type { LocalizeKeys } from "../../../common/translations/localize";
import "../../../components/ha-card";
import "../../../components/ha-dialog-header";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-button-menu";
import "../../../components/ha-md-divider";
import "../../../components/ha-md-menu-item";
import type { Condition, Trigger } from "../../../data/automation";
import type { Action } from "../../../data/script";
import { isTriggerList } from "../../../data/trigger";
import type { HomeAssistant } from "../../../types";
import "./action/ha-automation-action-editor";
import {
  ACTION_BUILDING_BLOCKS,
  getAutomationActionType,
} from "./action/ha-automation-action-row";
import { CONDITION_BUILDING_BLOCKS } from "./condition/ha-automation-condition";
import "./condition/ha-automation-condition-editor";
import type HaAutomationConditionEditor from "./condition/ha-automation-condition-editor";
import "./trigger/ha-automation-trigger-editor";
import type HaAutomationTriggerContent from "./trigger/ha-automation-trigger-editor";

export interface OpenSidebarConfig {
  save: (config: Trigger | Condition | Action) => void;
  close: () => void;
  rename: () => void;
  toggleYamlMode: () => boolean;
  disable: () => void;
  delete: () => void;
  config: Trigger | Condition | Action;
  type: "trigger" | "condition" | "action";
  uiSupported: boolean;
  yamlMode: boolean;
}

@customElement("ha-automation-sidebar")
export default class HaAutomationSidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: OpenSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @state() private _yamlMode = false;

  @state() private _requestShowId = false;

  @query(".sidebar-editor")
  public editor?: HaAutomationTriggerContent | HaAutomationConditionEditor;

  protected willUpdate(changedProperties) {
    if (changedProperties.has("config")) {
      this._requestShowId = false;
      if (this.config) {
        this._yamlMode = this.config.yamlMode;
        if (this._yamlMode) {
          this.editor?.yamlEditor?.setValue(this.config.config);
        }
      }
    }
  }

  protected render() {
    if (!this.config) {
      return nothing;
    }

    const disabled =
      "enabled" in this.config.config && this.config.config.enabled === false;
    const type = isTriggerList(this.config.config as Trigger)
      ? "list"
      : this.config.type === "action"
        ? getAutomationActionType(this.config.config as Action)
        : this.config.config[this.config.type];

    const isBuildingBlock = [
      ...CONDITION_BUILDING_BLOCKS,
      ...ACTION_BUILDING_BLOCKS,
    ].includes(type);

    const title = this.hass.localize(
      `ui.panel.config.automation.editor.${this.config.type}s.${this.config.type !== "condition" || !isBuildingBlock ? "edit" : "condition"}` as LocalizeKeys
    );
    const subtitle =
      this.hass.localize(
        `ui.panel.config.automation.editor.${this.config.type}s.type.${type}.label` as LocalizeKeys
      ) || type;

    const description = isBuildingBlock
      ? this.hass.localize(
          `ui.panel.config.automation.editor.${this.config.type}s.type.${type}.description.picker` as LocalizeKeys
        )
      : nothing;

    return html`
      <ha-card outlined class=${!this.isWide ? "mobile" : ""}>
        <ha-dialog-header>
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            @click=${this._closeSidebar}
          ></ha-icon-button>
          <span slot="title">${title}</span>
          <span slot="subtitle">${subtitle}</span>
          <ha-md-button-menu
            slot="actionItems"
            @click=${this._openOverflowMenu}
            @keydown=${stopPropagation}
            @closed=${stopPropagation}
            positioning="fixed"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-md-menu-item
              .clickAction=${this.config.rename}
              .disabled=${disabled || type === "list"}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.triggers.rename"
              )}
              <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
            </ha-md-menu-item>

            ${this.config.type === "trigger" &&
            !this._yamlMode &&
            !("id" in this.config.config) &&
            !this._requestShowId
              ? html`<ha-md-menu-item
                  .clickAction=${this._showTriggerId}
                  .disabled=${disabled || type === "list"}
                >
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.edit_id"
                  )}
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiIdentifier}
                  ></ha-svg-icon>
                </ha-md-menu-item>`
              : nothing}
            <ha-md-menu-item
              .clickAction=${this._toggleYamlMode}
              .disabled=${!this.config.uiSupported}
            >
              ${this.hass.localize(
                `ui.panel.config.automation.editor.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon slot="start" .path=${mdiPlaylistEdit}></ha-svg-icon>
            </ha-md-menu-item>

            <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

            <ha-md-menu-item
              .clickAction=${this.config.disable}
              .disabled=${type === "list"}
            >
              ${disabled
                ? this.hass.localize(
                    "ui.panel.config.automation.editor.actions.enable"
                  )
                : this.hass.localize(
                    "ui.panel.config.automation.editor.actions.disable"
                  )}
              <ha-svg-icon
                slot="start"
                .path=${disabled ? mdiPlayCircleOutline : mdiStopCircleOutline}
              ></ha-svg-icon>
            </ha-md-menu-item>
            <ha-md-menu-item .clickAction=${this.config.delete} class="warning">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.delete"
              )}
              <ha-svg-icon
                class="warning"
                slot="start"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-md-menu-item>
          </ha-md-button-menu>
        </ha-dialog-header>
        ${this.config.type === "trigger"
          ? html`<ha-automation-trigger-editor
              class="sidebar-editor"
              .hass=${this.hass}
              .trigger=${this.config.config as Trigger}
              @value-changed=${this._valueChangedSidebar}
              .uiSupported=${this.config.uiSupported}
              .showId=${this._requestShowId}
              .yamlMode=${this._yamlMode}
            ></ha-automation-trigger-editor>`
          : this.config.type === "condition" &&
              (this._yamlMode || !CONDITION_BUILDING_BLOCKS.includes(type))
            ? html`
                <ha-automation-condition-editor
                  class="sidebar-editor"
                  .hass=${this.hass}
                  .condition=${this.config.config as Condition}
                  .yamlMode=${this._yamlMode}
                  .uiSupported=${this.config.uiSupported}
                  @value-changed=${this._valueChangedSidebar}
                ></ha-automation-condition-editor>
              `
            : this.config.type === "action" &&
                (this._yamlMode || !ACTION_BUILDING_BLOCKS.includes(type))
              ? html`
                  <ha-automation-action-editor
                    class="sidebar-editor"
                    .hass=${this.hass}
                    .action=${this.config.config as Action}
                    .yamlMode=${this._yamlMode}
                    .uiSupported=${this.config.uiSupported}
                    @value-changed=${this._valueChangedSidebar}
                    sidebar
                    narrow
                  ></ha-automation-action-editor>
                `
              : description
                ? html`<div class="card-content">${description}</div>`
                : nothing}
      </ha-card>
    `;
  }

  private _valueChangedSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    this.config?.save(ev.detail.value);

    if (this.config) {
      fireEvent(this, "value-changed", {
        value: {
          ...this.config,
          config: ev.detail.value,
        },
      });
    }
  }

  private _closeSidebar() {
    this.config?.close();
    this.config = undefined;
  }

  private _openOverflowMenu(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
  }

  private _toggleYamlMode = () => {
    this._yamlMode = this.config!.toggleYamlMode();
    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
        yamlMode: this._yamlMode,
      },
    });
  };

  private _showTriggerId = () => {
    this._requestShowId = true;
  };

  static styles = css`
    :host {
      height: 100%;
      z-index: 1;
    }

    ha-card {
      height: 100%;
      width: 100%;
      outline: solid;
      outline-color: var(--primary-color);
      outline-offset: -2px;
      outline-width: 2px;
      display: block;
      overflow-y: auto;
      overflow-x: hidden;
    }
    ha-card.mobile {
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 0
      outline: none;
    }

    ha-dialog-header {
      background-color: var(--card-background-color);
      z-index: 1;
      position: sticky;
      top: 2px;
      margin-left: 2px;
      margin-right: 2px;
      border-radius: 12px;
    }

    ha-card.mobile ha-dialog-header {
      top: 0;
      margin-left: 0;
      margin-right: 0;
    }

    .card-content,
    .sidebar-editor {
      padding-top: 64px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar": HaAutomationSidebar;
  }
}
