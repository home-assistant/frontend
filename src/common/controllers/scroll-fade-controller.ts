import { css, type ReactiveControllerHost } from "lit";
import { ref } from "lit/directives/ref";

export const scrollFadeStyles = css`
  .scroll-fade-start,
  .scroll-fade-end {
    --scroll-fade-direction: to right;
    --scroll-fade-start: 0px;
    --scroll-fade-end: 0px;
    mask-image: linear-gradient(
      var(--scroll-fade-direction),
      transparent 0%,
      black var(--scroll-fade-start),
      black calc(100% - var(--scroll-fade-end)),
      transparent 100%
    );
  }
  .scroll-fade-start:dir(rtl),
  .scroll-fade-end:dir(rtl) {
    --scroll-fade-direction: to left;
  }
  .scroll-fade-start {
    --scroll-fade-start: var(--ha-space-4);
  }
  .scroll-fade-end {
    --scroll-fade-end: var(--ha-space-4);
  }
`;

export class ScrollFadeController {
  public start = false;

  public end = false;

  private _host: ReactiveControllerHost;

  private _element?: Element;

  private _resizeObserver = new ResizeObserver(() => this._update());

  constructor(host: ReactiveControllerHost) {
    this._host = host;
  }

  public target() {
    return ref(this._setElement);
  }

  private _setElement = (element?: Element) => {
    if (element === this._element) {
      return;
    }
    this._element?.removeEventListener("scroll", this._update);
    this._resizeObserver.disconnect();
    this._element = element;
    if (element) {
      element.addEventListener("scroll", this._update, { passive: true });
      this._resizeObserver.observe(element);
      for (const child of element.children) {
        this._resizeObserver.observe(child);
      }
    }
  };

  private _update = () => {
    if (!this._element) {
      return;
    }
    const rtl = this._element.matches(":dir(rtl)");
    const scrolled = rtl ? -this._element.scrollLeft : this._element.scrollLeft;
    const maxScroll = this._element.scrollWidth - this._element.clientWidth;
    const start = scrolled > 1;
    const end = maxScroll - scrolled > 1;
    if (start === this.start && end === this.end) {
      return;
    }
    this.start = start;
    this.end = end;
    this._host.requestUpdate();
  };
}
