import {
  mdiClose,
  mdiDotsVertical,
  mdiFlask,
  mdiPlay,
  mdiPlaylistEdit,
} from "@mdi/js";
import { ContextProvider } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../../../common/decorators/consume";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefaultStopPropagation } from "../../../../common/dom/prevent_default_stop_propagation";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-card";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-icon-button";
import { ScrollableFadeMixin } from "../../../../mixins/scrollable-fade-mixin";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import {
  automationDiffContext,
  automationRowChangeContext,
  diffMarkAt,
  diffRowChangeAt,
  type AutomationDiff,
} from "../ai/automation-ai-diff";
import "../ai/ha-automation-ai-changes";
import {
  automationRowRegistryContext,
  type AutomationRowRegistry,
} from "../automation-path";
import "../ha-automation-editor-warning";

export interface SidebarOverflowMenuEntry {
  clickAction: () => void;
  disabled?: boolean;
  label: string;
  icon?: string;
  danger?: boolean;
}

export type SidebarOverflowMenu = (SidebarOverflowMenuEntry | "separator")[];

@customElement("ha-automation-sidebar-card")
export default class HaAutomationSidebarCard extends ScrollableFadeMixin(
  LitElement
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ attribute: false }) public warnings?: string[];

  @property({ attribute: false }) public handleDropdownSelect!: (
    ev: CustomEvent
  ) => void;

  @property({ type: Boolean }) public narrow = false;

  @query(".card-content") private _contentElement!: HTMLDivElement;

  @consume({ context: automationDiffContext, subscribe: true })
  @state()
  private _aiDiff?: AutomationDiff;

  @consume({ context: automationRowRegistryContext })
  private _rowRegistry?: AutomationRowRegistry;

  // The YAML editor of the row shows how the AI changed it
  private _aiRowChangeProvider = new ContextProvider(this, {
    context: automationRowChangeContext,
    initialValue: undefined,
  });

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    const path = this._aiDiff && this._rowRegistry?.selectedPath();
    const change = path ? diffRowChangeAt(this._aiDiff, path) : undefined;
    if (change !== this._aiRowChangeProvider.value) {
      this._aiRowChangeProvider.setValue(change);
    }
  }

  protected get scrollableElement(): HTMLElement | null {
    return this._contentElement;
  }

  protected render() {
    return html`
      <ha-card
        outlined
        class=${classMap({
          mobile: !this.isWide,
          yaml: this.yamlMode,
        })}
      >
        <ha-dialog-header>
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            @click=${this._closeSidebar}
          ></ha-icon-button>
          <slot slot="title" name="title"></slot>
          <slot slot="subtitle" name="subtitle"></slot>
          ${this._aiDiff ? this._renderReviewActions() : nothing}
          <slot
            name="overflow-menu"
            slot="actionItems"
            ?hidden=${!!this._aiDiff}
          >
            <ha-dropdown
              @click=${preventDefaultStopPropagation}
              @keydown=${stopPropagation}
              placement="bottom-end"
            >
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
              <slot name="menu-items"></slot>
            </ha-dropdown>
          </slot>
        </ha-dialog-header>
        ${
          this.warnings
            ? html`<ha-automation-editor-warning
                .localize=${this.hass.localize}
                .warnings=${this.warnings}
              >
              </ha-automation-editor-warning>`
            : nothing
        }
        <div class="card-content ha-scrollbar">
          <ha-automation-ai-changes
            .yamlMode=${this.yamlMode}
            .path=${this._rowRegistry?.selectedPath()}
          ></ha-automation-ai-changes>
          <slot></slot>
          ${this.renderScrollableFades(this.isWide)}
        </div>
      </ha-card>
    `;
  }

  // While the user reviews changes of the AI the menu only has what helps
  // to review, the rest would change the automation. The sidebar handles
  // the select like the one of its own menu.
  private _renderReviewActions() {
    const path = this._rowRegistry?.selectedPath();
    const removed = !!path && diffMarkAt(this._aiDiff, path) === "removed";
    const has = (value: string) =>
      !!this.querySelector(
        `:scope > ha-dropdown-item[slot="menu-items"][value="${value}"]:not([disabled])`
      );
    return html`<ha-dropdown
      slot="actionItems"
      @click=${preventDefaultStopPropagation}
      @keydown=${stopPropagation}
      placement="bottom-end"
    >
      <ha-icon-button
        slot="trigger"
        .label=${this.hass.localize("ui.common.menu")}
        .path=${mdiDotsVertical}
      ></ha-icon-button>
      ${
        !removed && has("run")
          ? html`<ha-dropdown-item value="run">
              <ha-svg-icon slot="icon" .path=${mdiPlay}></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.run"
              )}
            </ha-dropdown-item>`
          : nothing
      }
      ${
        !removed && has("test")
          ? html`<ha-dropdown-item value="test">
              <ha-svg-icon slot="icon" .path=${mdiFlask}></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.test"
              )}
            </ha-dropdown-item>`
          : nothing
      }
      ${
        has("toggle_yaml_mode")
          ? html`<ha-dropdown-item value="toggle_yaml_mode">
              <ha-svg-icon slot="icon" .path=${mdiPlaylistEdit}></ha-svg-icon>
              ${this.hass.localize(
                `ui.panel.config.automation.editor.edit_${this.yamlMode ? "ui" : "yaml"}`
              )}
            </ha-dropdown-item>`
          : nothing
      }
    </ha-dropdown>`;
  }

  private _closeSidebar() {
    fireEvent(this, "close-sidebar");
  }

  static get styles() {
    return [
      ...super.styles,
      haStyleScrollbar,
      css`
        ha-card {
          position: relative;
          height: 100%;
          width: 100%;
          border-color: var(--primary-color);
          border-width: 2px;
          display: flex;
          flex-direction: column;
        }

        @media all and (max-width: 870px) {
          ha-card.mobile {
            border: none;
            box-shadow: none;
          }
          ha-card.mobile {
            border-bottom-right-radius: var(--ha-border-radius-square);
            border-bottom-left-radius: var(--ha-border-radius-square);
          }
        }

        ha-dialog-header {
          border-radius: var(--ha-card-border-radius);
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          position: relative;
          background-color: var(
            --ha-dialog-surface-background,
            var(--mdc-theme-surface, #fff)
          );
        }

        .card-content {
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
          margin-top: 0;
          padding-top: 0;
          padding-bottom: max(var(--safe-area-inset-bottom, 0px), 32px);
        }

        .fade-top {
          top: var(--ha-space-17);
        }

        @media all and (max-width: 870px) {
          .card-content {
            padding-bottom: 42px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-card": HaAutomationSidebarCard;
  }
}
