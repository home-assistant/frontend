import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

@customElement("ha-faded")
class HaFaded extends LitElement {
  @property({ type: Number }) public fadedHeight = 102;

  @state() faded = true;

  @query(".container") private _container!: HTMLDivElement;

  protected render(): TemplateResult {
    return html`
      <div
        class="container ${classMap({ faded: this.faded })}"
        style=${this.faded ? `max-height: ${this.fadedHeight}px` : ""}
        @click=${this._showContent}
      >
        <slot></slot>
      </div>
    `;
  }

  get _slottedHeight(): number {
    return (this._container.firstElementChild as HTMLSlotElement)
      .assignedElements()
      .reduce((partial, element) => partial + element.clientHeight, 0);
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (
      this._slottedHeight !== 0 &&
      this._slottedHeight < this.fadedHeight + 16
    ) {
      this.faded = false;
    }
  }

  private async _showContent(): Promise<void> {
    this.faded = false;
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
