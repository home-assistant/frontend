import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

@customElement("ha-faded")
class HaFaded extends LitElement {
  @property({ type: Number }) public fadedHeight = 102;

  @state() _contentShown = false;

  @query(".container") private _container!: HTMLDivElement;

  protected render(): TemplateResult {
    return html`
      <div
        class="container ${classMap({ faded: !this._contentShown })}"
        style=${!this._contentShown ? `max-height: ${this.fadedHeight}px` : ""}
        @click=${this._showContent}
      >
        <slot></slot>
      </div>
    `;
  }

  get _slottedHeight(): number {
    const elements = (
      this._container.firstElementChild as HTMLSlotElement
    ).assignedElements();

    if (!elements.length) {
      return this._container.clientHeight;
    }
    return elements.reduce(
      (partial, element) => partial + element.clientHeight,
      0
    );
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (this._slottedHeight < this.fadedHeight) {
      this._contentShown = true;
    }
  }

  private async _showContent(): Promise<void> {
    this._contentShown = true;
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        display: block;
        height: auto;
        cursor: default;
      }
      .faded {
        cursor: pointer;
        -webkit-mask-image: linear-gradient(
          to bottom,
          black 25%,
          transparent 100%
        );
        mask-image: linear-gradient(to bottom, black 25%, transparent 100%);
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
