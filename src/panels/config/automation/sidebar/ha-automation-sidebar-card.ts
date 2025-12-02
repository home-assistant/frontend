import { mdiClose, mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-card";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-button-menu";
import "../../../../components/ha-md-divider";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../ha-automation-editor-warning";
import { ScrollableFadeMixin } from "../../../../mixins/scrollable-fade-mixin";

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

  @property({ type: Boolean }) public narrow = false;

  @query(".card-content") private _contentElement!: HTMLDivElement;

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
          <slot name="overflow-menu" slot="actionItems">
            <ha-md-button-menu
              quick
              @click=${this._openOverflowMenu}
              @keydown=${stopPropagation}
              @closed=${stopPropagation}
              .positioning=${this.narrow ? "absolute" : "fixed"}
              anchor-corner="end-end"
              menu-corner="start-end"
            >
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
              <slot name="menu-items"></slot>
            </ha-md-button-menu>
          </slot>
        </ha-dialog-header>
        ${this.warnings
          ? html`<ha-automation-editor-warning
              .localize=${this.hass.localize}
              .warnings=${this.warnings}
            >
            </ha-automation-editor-warning>`
          : nothing}
        <div class="card-content ha-scrollbar">
          <slot></slot>
          ${this.renderScrollableFades(this.isWide)}
        </div>
      </ha-card>
    `;
  }

  private _closeSidebar() {
    fireEvent(this, "close-sidebar");
  }

  private _openOverflowMenu(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
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
