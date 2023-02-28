import { mdiNfcVariant } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-svg-icon";
import { TagRowData } from "./ha-config-tags";

@customElement("tag-image")
export class HaTagImage extends LitElement {
  @property() public tag?: TagRowData;

  private _timeout?: number;

  protected updated() {
    const msSinceLastScaned = this.tag?.last_scanned_datetime
      ? new Date().getTime() - this.tag.last_scanned_datetime.getTime()
      : undefined;

    if (msSinceLastScaned && msSinceLastScaned < 1000) {
      if (this._timeout) {
        clearTimeout(this._timeout);
        this._timeout = undefined;
        this.classList.remove("just-scanned");
        requestAnimationFrame(() => this.classList.add("just-scanned"));
      } else {
        this.classList.add("just-scanned");
      }
      this._timeout = window.setTimeout(() => {
        this.classList.remove("just-scanned");
        this._timeout = undefined;
      }, 10000);
    } else if (!msSinceLastScaned || msSinceLastScaned > 10000) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
      this.classList.remove("just-scanned");
    }
  }

  protected render() {
    if (!this.tag) {
      return nothing;
    }
    return html`<div class="container">
      <div class="image">
        <ha-svg-icon .path=${mdiNfcVariant}></ha-svg-icon>
      </div>
    </div>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      .image {
        height: 100%;
        width: 100%;
        background-size: cover;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .container {
        height: 40px;
        width: 40px;
        border-radius: 50%;
      }
      :host(.just-scanned) .container {
        animation: glow 10s;
      }
      @keyframes glow {
        0% {
          box-shadow: 0px 0px 24px 0px rgba(var(--rgb-primary-color), 0);
        }
        10% {
          box-shadow: 0px 0px 24px 0px rgba(var(--rgb-primary-color), 1);
        }
        100% {
          box-shadow: 0px 0px 24px 0px rgba(var(--rgb-primary-color), 0);
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tag-image": HaTagImage;
  }
}
