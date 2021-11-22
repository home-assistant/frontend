import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

@customElement("ha-faded")
class HaFaded extends LitElement {
  @property({ type: Number }) public fadedHeight = 84;

  @state() faded = true;

  @state() fadeable = true;

  @query(".container") private _container!: HTMLDivElement;

  protected render(): TemplateResult {
    return html`
      <div
        class="container ${classMap({ faded: this.fadeable && this.faded })}"
        style=${this.faded ? `max-height: ${this.fadedHeight}px` : ""}
      >
        <slot></slot>
      </div>
      ${this.fadeable
        ? html`
            <div
              class="show ${classMap({ faded: this.fadeable && this.faded })}"
              @click=${this._toggleContainer}
            >
              ${this.faded ? "Show more" : "Show less"}
            </div>
          `
        : ""}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (
      this._container.clientHeight !== 0 &&
      this._container.clientHeight < this.fadedHeight
    ) {
      this.fadeable = false;
    }
  }

  private async _toggleContainer(): Promise<void> {
    if (this.fadeable) {
      this.faded = !this.faded;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        display: block;
        height: auto;
      }
      .container.faded {
        -webkit-mask-image: linear-gradient(
          to bottom,
          black 25%,
          transparent 100%
        );
        mask-image: linear-gradient(to bottom, black 25%, transparent 100%);
        overflow-y: hidden;
      }
      .show {
        cursor: pointer;
        color: var(--primary-color);
        position: relative;
        text-align: right;
        font-weight: 500;
      }
      .show.faded {
        bottom: 16px;
      }
      .show:hover {
        font-weight: 600;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-faded": HaFaded;
  }
}
