import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-icon-button-group";
import "./ha-tooltip";
import "./ha-md-divider";

export interface HACodeEditorToolbarItem {
  [key: string]: any;
  path: string;
  label: string;
  class?: string;
  disabled?: boolean;
  tooltip?: string;
  action: (e: Event) => any;
  divider?: boolean;
}

@customElement("ha-code-editor-toolbar")
export class HaCodeEditorToolbar extends LitElement {
  @property({ type: Array }) public items: HACodeEditorToolbarItem[] = [];

  protected render(): TemplateResult {
    return html`
      <ha-icon-button-group class="editor-buttongroup">
        ${this.items.map((item) =>
          item.divider
            ? html`<div role="separator"></div>`
            : html`<ha-tooltip
                .disabled=${!item.tooltip}
                .content=${item.tooltip ?? ""}
              >
                <ha-icon-button
                  class="editor-button ${item.class}"
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
        --code-editor-gutter-color,
        var(--secondary-background-color, whitesmoke)
      );
    }

    .editor-buttongroup {
      background-color: transparent;
      padding-right: 4px;
      height: var(--code-editor-toolbar-height, 32px);
    }

    .editor-button {
      color: var(--secondary-text-color);
      --mdc-icon-button-size: calc(
        var(--code-editor-toolbar-height, 32px) - 4px
      );
      --mdc-icon-size: calc(var(--code-editor-toolbar-height, 32px) - 14px);
      /* Ensure button is clickable on iOS */
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor-toolbar": HaCodeEditorToolbar;
  }
}
