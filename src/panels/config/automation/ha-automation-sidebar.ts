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
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { handleStructError } from "../../../common/structs/handle-errors";
import type { LocalizeKeys } from "../../../common/translations/localize";
import "../../../components/ha-card";
import "../../../components/ha-dialog-header";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-button-menu";
import "../../../components/ha-md-divider";
import "../../../components/ha-md-menu-item";
import type { Condition, Trigger } from "../../../data/automation";
import type { Action, RepeatAction } from "../../../data/script";
import { isTriggerList } from "../../../data/trigger";
import type { HomeAssistant } from "../../../types";
import "./action/ha-automation-action-editor";
import { getAutomationActionType } from "./action/ha-automation-action-row";
import { getRepeatType } from "./action/types/ha-automation-action-repeat";
import "./condition/ha-automation-condition-editor";
import type HaAutomationConditionEditor from "./condition/ha-automation-condition-editor";
import "./ha-automation-editor-warning";
import "./trigger/ha-automation-trigger-editor";
import type HaAutomationTriggerEditor from "./trigger/ha-automation-trigger-editor";
import { ACTION_BUILDING_BLOCKS } from "../../../data/action";
import { CONDITION_BUILDING_BLOCKS } from "../../../data/condition";

export interface OpenSidebarConfig {
  save: (config: Trigger | Condition | Action) => void;
  close: () => void;
  rename: () => void;
  toggleYamlMode: () => boolean;
  disable: () => void;
  delete: () => void;
  config: Trigger | Condition | Action;
  type: "trigger" | "condition" | "action" | "option";
  uiSupported: boolean;
  yamlMode: boolean;
}

@customElement("ha-automation-sidebar")
export default class HaAutomationSidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: OpenSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @state() private _yamlMode = false;

  @state() private _requestShowId = false;

  @state() private _warnings?: string[];

  @query(".sidebar-editor")
  public editor?: HaAutomationTriggerEditor | HaAutomationConditionEditor;

  protected willUpdate(changedProperties) {
    if (changedProperties.has("config")) {
      this._requestShowId = false;
      this._warnings = undefined;
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
      this.disabled ||
      ("enabled" in this.config.config && this.config.config.enabled === false);
    let type = isTriggerList(this.config.config as Trigger)
      ? "list"
      : this.config.type === "action"
        ? getAutomationActionType(this.config.config as Action)
        : this.config.config[this.config.type];

    if (this.config.type === "action" && type === "repeat") {
      type = `repeat_${getRepeatType((this.config.config as RepeatAction).repeat)}`;
    }

    const isBuildingBlock = [
      ...CONDITION_BUILDING_BLOCKS,
      ...ACTION_BUILDING_BLOCKS,
    ].includes(type);

    const subtitle = this.hass.localize(
      (this.config.type === "option"
        ? "ui.panel.config.automation.editor.actions.type.choose.label"
        : `ui.panel.config.automation.editor.${this.config.type}s.${this.config.type}`) as LocalizeKeys
    );
    const title =
      this.hass.localize(
        (this.config.type === "option"
          ? "ui.panel.config.automation.editor.actions.type.choose.option_label"
          : `ui.panel.config.automation.editor.${this.config.type}s.type.${type}.label`) as LocalizeKeys
      ) || type;

    const description =
      isBuildingBlock || this.config.type === "option"
        ? this.hass.localize(
            (this.config.type === "option"
              ? "ui.panel.config.automation.editor.actions.type.choose.option_description"
              : `ui.panel.config.automation.editor.${this.config.type}s.type.${type}.description.picker`) as LocalizeKeys
          )
        : "";

    return html`
      <ha-card
        outlined
        class=${classMap({
          mobile: !this.isWide,
          yaml: this._yamlMode,
        })}
      >
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
            ${this.config.type !== "option"
              ? html`
                  <ha-md-menu-item
                    .clickAction=${this._toggleYamlMode}
                    .disabled=${!this.config.uiSupported || !!this._warnings}
                  >
                    ${this.hass.localize(
                      `ui.panel.config.automation.editor.edit_${!this._yamlMode ? "yaml" : "ui"}`
                    )}
                    <ha-svg-icon
                      slot="start"
                      .path=${mdiPlaylistEdit}
                    ></ha-svg-icon>
                  </ha-md-menu-item>
                `
              : nothing}

            <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

            ${this.config.type !== "option"
              ? html`
                  <ha-md-menu-item
                    .clickAction=${this.config.disable}
                    .disabled=${this.disabled || type === "list"}
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
                      .path=${disabled
                        ? mdiPlayCircleOutline
                        : mdiStopCircleOutline}
                    ></ha-svg-icon>
                  </ha-md-menu-item>
                `
              : nothing}
            <ha-md-menu-item
              .clickAction=${this.config.delete}
              class="warning"
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                `ui.panel.config.automation.editor.actions.${this.config.type !== "option" ? "delete" : "type.choose.remove_option"}`
              )}
              <ha-svg-icon
                class="warning"
                slot="start"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-md-menu-item>
          </ha-md-button-menu>
        </ha-dialog-header>
        ${this._warnings
          ? html`<ha-automation-editor-warning
              .localize=${this.hass.localize}
              .warnings=${this._warnings}
            >
            </ha-automation-editor-warning>`
          : nothing}
        <div class="card-content">
          ${this.config.type === "trigger"
            ? html`<ha-automation-trigger-editor
                class="sidebar-editor"
                .hass=${this.hass}
                .trigger=${this.config.config as Trigger}
                @value-changed=${this._valueChangedSidebar}
                .uiSupported=${this.config.uiSupported}
                .showId=${this._requestShowId}
                .yamlMode=${this._yamlMode}
                .disabled=${this.disabled}
                @ui-mode-not-available=${this._handleUiModeNotAvailable}
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
                    .disabled=${this.disabled}
                    @ui-mode-not-available=${this._handleUiModeNotAvailable}
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
                      .disabled=${this.disabled}
                      @ui-mode-not-available=${this._handleUiModeNotAvailable}
                    ></ha-automation-action-editor>
                  `
                : description || nothing}
        </div>
      </ha-card>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
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
      --ha-card-border-radius: var(
        --ha-dialog-border-radius,
        var(--ha-border-radius-2xl)
      );
      border-radius: var(--ha-card-border-radius);
    }

    ha-card {
      height: 100%;
      width: 100%;
      border-color: var(--primary-color);
      border-width: 2px;
      display: block;
    }
    ha-card.mobile {
      border-bottom-right-radius: var(--ha-border-radius-square);
      border-bottom-left-radius: var(--ha-border-radius-square);
    }

    @media all and (max-width: 870px) {
      ha-card.mobile {
        max-height: 70vh;
        max-height: 70dvh;
        border-width: 2px 2px 0;
      }
      ha-card.mobile.yaml {
        height: 70vh;
        height: 70dvh;
      }
    }

    ha-dialog-header {
      border-radius: var(--ha-card-border-radius);
    }
    .sidebar-editor {
      padding-top: 64px;
    }

    .card-content {
      max-height: calc(100% - 80px);
      overflow: auto;
    }

    @media (min-width: 450px) and (min-height: 500px) {
      .card-content {
        max-height: calc(100% - 104px);
        overflow: auto;
      }
    }

    @media all and (max-width: 870px) {
      ha-card.mobile .card-content {
        max-height: calc(
          70vh - 88px - max(var(--safe-area-inset-bottom), 16px)
        );
        max-height: calc(
          70dvh - 88px - max(var(--safe-area-inset-bottom), 16px)
        );
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar": HaAutomationSidebar;
  }
}
