import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { truncateMiddle } from "../common/string/truncate-middle";

@customElement("ha-truncate-middle")
export class HaTruncateMiddle extends LitElement {
  @property() public text = "";

  @state() private _displayText = "";

  private _resizeObserver?: ResizeObserver;

  private _updateQueued = false;

  public connectedCallback() {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => this._scheduleUpdate());
    this._resizeObserver.observe(this);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._updateQueued = false;
  }

  protected firstUpdated() {
    this._scheduleUpdate();
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("text")) {
      this._displayText = this.text;
      this._scheduleUpdate();
    }
  }

  protected render() {
    return html`<span>${this._displayText || this.text}</span>`;
  }

  private _scheduleUpdate() {
    if (this._updateQueued) {
      return;
    }
    this._updateQueued = true;
    requestAnimationFrame(() => {
      this._updateQueued = false;
      this._updateDisplayText();
    });
  }

  private _updateDisplayText() {
    if (!this.isConnected) {
      return;
    }
    const availableWidth = Math.max(0, this.clientWidth - 20);
    if (!availableWidth) {
      return;
    }
    const span = this.shadowRoot?.querySelector("span");
    if (!span) {
      return;
    }
    const font = getComputedStyle(span).font;
    const truncated = truncateMiddle(this.text, availableWidth, font);
    if (this._displayText !== truncated) {
      this._displayText = truncated;
    }
  }

  static styles = css`
    :host {
      display: block;
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
      overflow: hidden;
    }

    span {
      display: block;
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-truncate-middle": HaTruncateMiddle;
  }
}
