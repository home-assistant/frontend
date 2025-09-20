import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, queryAll } from "lit/decorators";
import "./ha-icon";
import "./ha-icon-button";
import type { HaIconButton } from "./ha-icon-button";
import "./ha-icon-button-group";
import "./ha-tooltip";

export type HaIconButtonToolbarItem =
  | {
      [key: string]: any;
      divider?: false;
      path: string;
      label: string;
      id?: string;
      class?: string;
      disabled?: boolean;
      tooltip?: string;
      action?: (e: Event) => any;
    }
  | {
      [key: string]: any;
      divider: true;
      path?: never;
      label?: never;
      id?: never;
      class?: never;
      disabled?: never;
      tooltip?: never;
      action?: never;
    };

@customElement("ha-icon-button-toolbar")
export class HaIconButtonToolbar extends LitElement {
  @property({ type: Array }) public items: HaIconButtonToolbarItem[] = [];

  @queryAll("ha-icon-button") private _buttons?: HaIconButton[];

  // Returns all toolbar buttons, or undefined if there are none.
  // Optionally returns only those with matching selector.
  public findToolbarButtons(selector = ""): HaIconButton[] | undefined {
    // Search for all toolbar buttons
    const toolbarButtons = this._buttons?.filter((button) =>
      button.classList.contains("icon-toolbar-button")
    );
    if (!toolbarButtons || !toolbarButtons.length) return undefined;
    if (!selector.length) return toolbarButtons;
    // Filter by user class if provided
    const classButtons = toolbarButtons.filter((button) =>
      button.querySelector(selector)
    );
    return classButtons.length ? classButtons : undefined;
  }

  // Returns a toolbar button based on the provided id.
  // Will return undefined if not found.
  public findToolbarButtonById(id = ""): HaIconButton | undefined {
    // Find the specified id
    const element = this.shadowRoot?.getElementById(id);
    if (!element || element.localName !== "ha-icon-button") return undefined;
    return element as HaIconButton;
  }

  protected render(): TemplateResult {
    return html`
      <ha-icon-button-group class="icon-toolbar-buttongroup">
        ${this.items.map((item) =>
          item.divider
            ? html`<div class="icon-toolbar-divider" role="separator"></div>`
            : html`<ha-tooltip
                  .disabled=${!item.tooltip}
                  .for=${item.id ?? "icon-button-" + item.label}
                  >${item.tooltip ?? ""}</ha-tooltip
                >
                <ha-icon-button
                  .id=${item.id ?? "icon-button-" + item.label}
                  .className=${["icon-toolbar-button", item.class]
                    .filter(Boolean)
                    .join(" ")}
                  @click=${item.action}
                  .label=${item.label}
                  .path=${item.path}
                  ?disabled=${item.disabled}
                ></ha-icon-button>`
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
      --icon-button-toolbar-height: 32px;
      --icon-button-toolbar-button: calc(
        var(--icon-button-toolbar-height) - 4px
      );
      --icon-button-toolbar-icon: calc(
        var(--icon-button-toolbar-height) - 14px
      );
    }

    .icon-toolbar-divider {
      height: var(--icon-button-toolbar-icon);
      margin: 0px 4px;
      border: 0.5px solid
        var(--divider-color, var(--secondary-text-color, transparent));
    }

    .icon-toolbar-buttongroup {
      background-color: transparent;
      padding-right: 4px;
      height: var(--icon-button-toolbar-height);
    }

    .icon-toolbar-button {
      color: var(--secondary-text-color);
      --mdc-icon-button-size: var(--icon-button-toolbar-button);
      --mdc-icon-size: var(--icon-button-toolbar-icon);
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
