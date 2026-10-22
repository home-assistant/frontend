import { mdiContentPaste } from "@mdi/js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-button";
import "./ha-svg-icon";

/**
 * @element ha-paste-bar
 *
 * @summary Bar with a paste button, placed below a scrolling list, e.g. in the
 * add automation element, create card and create badge dialogs.
 * Only render it when there is something on the clipboard.
 *
 * @attr label - Localized label of the paste button, e.g. "Paste action".
 *
 * @fires paste-element - Fired when the paste button is clicked.
 */
@customElement("ha-paste-bar")
export class HaPasteBar extends LitElement {
  @property() public label = "";

  protected render() {
    return html`<ha-button appearance="filled" size="s" @click=${this._paste}>
      <ha-svg-icon slot="start" .path=${mdiContentPaste}></ha-svg-icon>
      ${this.label}
    </ha-button>`;
  }

  private _paste() {
    fireEvent(this, "paste-element");
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      padding: var(--ha-space-3);
      border-top: var(--ha-border-width-sm) solid var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-paste-bar": HaPasteBar;
  }

  interface HASSDomEvents {
    "paste-element": undefined;
  }
}
