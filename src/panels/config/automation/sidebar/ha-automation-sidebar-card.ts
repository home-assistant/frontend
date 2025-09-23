import { ResizeController } from "@lit-labs/observers/resize-controller";
import { mdiClose, mdiDotsVertical } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-card";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-button-menu";
import "../../../../components/ha-md-divider";
import "../../../../components/ha-md-menu-item";
import type { HomeAssistant } from "../../../../types";
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
export default class HaAutomationSidebarCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @property({ attribute: false }) public warnings?: string[];

  @property({ type: Boolean }) public narrow = false;

  @state() private _contentScrolled = false;

  @state() private _contentScrollable = false;

  @query(".card-content") private _contentElement!: HTMLDivElement;

  private _contentSize = new ResizeController(this, {
    target: null,
    callback: (entries) => {
      if (entries[0]?.target) {
        this._canScrollDown(entries[0].target);
      }
    },
  });

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this._contentSize.observe(this._contentElement);
    this._updateHeaderHeight();
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has("hass") || _changedProperties.has("narrow")) {
      this._updateHeaderHeight();
    }
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
        <ha-dialog-header
          class=${classMap({ scrolled: this._contentScrolled })}
        >
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
        <div class="card-content" @scroll=${this._onScroll}>
          <slot></slot>
        </div>
        <div
          class=${classMap({ fade: true, scrollable: this._contentScrollable })}
        ></div>
      </ha-card>
    `;
  }

  @eventOptions({ passive: true })
  private _onScroll(ev) {
    const top = ev.target.scrollTop ?? 0;
    this._contentScrolled = top > 0;

    this._canScrollDown(ev.target);
  }

  private _canScrollDown(element: HTMLElement) {
    const safeAreaInsetBottom =
      parseFloat(
        getComputedStyle(element).getPropertyValue("--safe-area-inset-bottom")
      ) || 0;
    this._contentScrollable =
      (element.scrollHeight ?? 0) - (element.clientHeight ?? 0) >
      (element.scrollTop ?? 0) + safeAreaInsetBottom + 16;
  }

  private _closeSidebar() {
    fireEvent(this, "close-sidebar");
  }

  private _openOverflowMenu(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
  }

  private _updateHeaderHeight() {
    requestAnimationFrame(() => {
      const header = this.shadowRoot?.querySelector("ha-dialog-header");
      if (header) {
        const headerHeight = header.offsetHeight;
        this.style.setProperty(
          "--ha-dialog-header-height",
          `${headerHeight}px`
        );
      }
    });
  }

  static styles = css`
    ha-card {
      position: relative;
      height: 100%;
      width: 100%;
      border-color: var(--primary-color);
      border-width: 2px;
      display: block;
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
      box-shadow: none;
      transition: box-shadow 180ms ease-in-out;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      position: relative;
      background-color: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
    }

    ha-dialog-header.scrolled {
      box-shadow: var(--bar-box-shadow);
    }

    .fade {
      position: absolute;
      bottom: 1px;
      left: 1px;
      right: 1px;
      height: 16px;
      pointer-events: none;
      transition: box-shadow 180ms ease-in-out;
      background-color: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      transform: rotate(180deg);
      border-radius: var(--ha-card-border-radius);
      border-bottom-left-radius: var(--ha-border-radius-square);
      border-bottom-right-radius: var(--ha-border-radius-square);
    }

    .fade.scrollable {
      box-shadow: var(--bar-box-shadow);
    }

    .card-content {
      max-height: calc(
        100% - max(var(--safe-area-inset-bottom, 0px), 16px) - var(
            --ha-dialog-header-height
          )
      );
      overflow: auto;
      margin-top: 0;
    }

    @media all and (max-width: 870px) {
      .fade {
        border-radius: var(--ha-border-radius-square);
      }

      .card-content {
        max-height: calc(100% - var(--ha-dialog-header-height) - 34px);
        overflow: auto;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-card": HaAutomationSidebarCard;
  }
}
