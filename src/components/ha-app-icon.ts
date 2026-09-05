import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import type { HASSDomCurrentTargetEvent } from "../common/dom/fire_event";

@customElement("ha-app-icon")
export class HaAppIcon extends LitElement {
  @property() public slug = "";

  @property({ attribute: "has-icon", type: Boolean })
  public hasIcon?: boolean;

  @property() public alt = "";

  @property() public loading: "eager" | "lazy" = "eager";

  @state() private _failedSrc?: string;

  @query("img") private _image?: HTMLImageElement;

  private get _src() {
    return `/api/hassio/addons/${this.slug}/icon`;
  }

  protected render() {
    const src = this._src;

    if (!this.slug || this.hasIcon === false || this._failedSrc === src) {
      return html`<slot></slot>`;
    }

    return keyed(
      src,
      html`
        <img
          src=${src}
          alt=${this.alt}
          loading=${this.loading}
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          @error=${this._handleError}
        />
      `
    );
  }

  private _handleError(ev: HASSDomCurrentTargetEvent<HTMLImageElement>) {
    if (ev.currentTarget !== this._image) {
      return;
    }
    this._failedSrc = ev.currentTarget.getAttribute("src") ?? undefined;
  }

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--ha-app-icon-size, var(--mdc-icon-size));
      height: var(--ha-app-icon-size, var(--mdc-icon-size));
      flex-shrink: 0;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-app-icon": HaAppIcon;
  }
}
