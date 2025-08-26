import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-icon";
import "./ha-icon-button";
import type { HaIconButton } from "./ha-icon-button";
import "./ha-icon-button-group";
import "./ha-tooltip";
import "./ha-md-divider";

export interface HaIconButtonToolbarItem {
  [key: string]: any;
  path: string;
  label: string;
  id: string;
  class?: string;
  disabled?: boolean;
  tooltip?: string;
  action: (e: Event) => any;
  divider?: boolean;
}

@customElement("ha-icon-button-toolbar")
export class HaIconButtonToolbar extends LitElement {
  @property({ type: Array }) public items: HaIconButtonToolbarItem[] = [];

  // Returns all toolbar buttons, or undefined if there are none.
  // Optionally returns only those with matching selector.
  public findToolbarButtons(selector = ""): HaIconButton[] | undefined {
    const toolbarRoot = this.shadowRoot;
    if (!toolbarRoot) return undefined;
    // Search for all toolbar buttons
    const allButtonNodes = toolbarRoot.querySelectorAll("ha-icon-button");
    const allButtons = [...allButtonNodes];
    const toolbarButtons = Array.prototype.filter.call(allButtons, (button) =>
      button.classList.contains("icon-toolbar-button")
    );
    if (!toolbarButtons.length) return undefined;
    if (!selector.length) return toolbarButtons;
    // Filter by user class if provided
    const classButtons = Array.prototype.filter.call(toolbarButtons, (button) =>
      button.querySelector(selector)
    );
    return classButtons.length ? classButtons : undefined;
  }

  // Returns a toolbar button based on the provided id.
  // Will return undefined if not found.
  public findToolbarButtonById(id = ""): HaIconButton | undefined {
    const toolbarRoot = this.shadowRoot;
    if (!toolbarRoot) return undefined;
    // Find the specified id
    const element = toolbarRoot.getElementById(id);
    if (!element || element.localName !== "ha-icon-button") return undefined;
    return element as HaIconButton;
  }

  protected render(): TemplateResult {
    return html`
      <ha-icon-button-group class="icon-toolbar-buttongroup">
        ${this.items.map((item) =>
          item.divider
            ? html`<div role="separator"></div>`
            : html`<ha-tooltip
                .disabled=${!item.tooltip}
                .content=${item.tooltip ?? ""}
              >
                <ha-icon-button
                  id=${item.id ?? ""}
                  class="icon-toolbar-button ${item.class}"
                  @click=${item.action}
                  .label=${item.label}
                  .path=${item.path}
                  ?disabled=${item.disabled}
                ></ha-icon-button>
              </ha-tooltip>`
        )}
      </ha-icon-button-group>
    `;
  }

  static styles = css`
    :host {
      position: absolute;
      top: 0px;
      width: 100%;
      display: flex;
      flex-direction: row-reverse;
      background-color: var(
        --icon-button-toolbar-color,
        var(--secondary-background-color, whitesmoke)
      );
    }

    .icon-toolbar-buttongroup {
      background-color: transparent;
      padding-right: 4px;
      height: var(--icon-button-toolbar-height, 32px);
    }

    .icon-toolbar-button {
      color: var(--secondary-text-color);
      --mdc-icon-button-size: calc(
        var(--icon-button-toolbar-height, 32px) - 4px
      );
      --mdc-icon-size: calc(var(--icon-button-toolbar-height, 32px) - 14px);
      /* Ensure button is clickable on iOS */
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-toolbar": HaIconButtonToolbar;
  }
}
