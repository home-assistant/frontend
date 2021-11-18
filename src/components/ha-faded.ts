import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

@customElement("ha-faded")
class HaFaded extends LitElement {
  @state() faded = true;

  @state() fadeable = true;

  @query(".container") private _container!: HTMLDivElement;

  protected render(): TemplateResult {
    return html`
      <div
        class="container ${classMap({
          fadeable: this.fadeable,
          faded: this.fadeable && this.faded,
        })}"
        @click=${this._toggleContainer}
      >
        <slot></slot>
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (
      this._container.clientHeight !== 0 &&
      this._container.clientHeight < 112
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
      .fadeable {
        cursor: pointer;
      }
      .faded {
        -webkit-mask-image: linear-gradient(
          to bottom,
          black 25%,
          transparent 100%
        );
        mask-image: linear-gradient(to bottom, black 25%, transparent 100%);
        max-height: 112px;
        overflow-y: hidden;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-faded": HaFaded;
  }
}
