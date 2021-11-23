import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

@customElement("ha-faded")
class HaFaded extends LitElement {
  @property({ type: Number, attribute: "faded-height" })
  public fadedHeight = 102;

  @state() _contentShown = false;

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
    return (
      this.shadowRoot!.querySelector(".container")
        ?.firstElementChild as HTMLSlotElement
    )
      .assignedElements()
      .reduce(
        (partial, element) => partial + (element as HTMLElement).offsetHeight,
        0
      );
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    const callback = setInterval(() => {
      const height = this._slottedHeight;
      if (height !== 0) {
        if (height < this.fadedHeight + 50) {
          this._contentShown = true;
        }
        clearInterval(callback);
      }
    }, 100);
    // If we don't get a height in 1s, there is nothing to show.
    setTimeout(() => {
      clearInterval(callback);
    }, 1000);
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
