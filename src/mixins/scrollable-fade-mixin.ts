import { ResizeController } from "@lit-labs/observers/resize-controller";
import type {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { html } from "lit";
import { classMap } from "lit/directives/class-map";
import { state } from "lit/decorators";
import type { Constructor } from "../types";
import { scrollableFadeStyles } from "../resources/styles";

const stylesArray = (styles?: CSSResultGroup | CSSResultGroup[]) =>
  styles === undefined ? [] : Array.isArray(styles) ? styles : [styles];

export const ScrollableFadeMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class ScrollableFadeClass extends superClass {
    @state() protected _contentScrolled = false;

    @state() protected _contentScrollable = false;

    private _scrollTarget?: HTMLElement | null;

    private _onScroll = (ev: Event) => {
      const target = ev.currentTarget as HTMLElement;
      this._contentScrolled = (target.scrollTop ?? 0) > 0;
      this._updateScrollableState(target);
    };

    private _resize = new ResizeController(this, {
      target: null,
      callback: (entries) => {
        const target = entries[0]?.target as HTMLElement | undefined;
        if (target) {
          this._updateScrollableState(target);
        }
      },
    });

    private static readonly DEFAULT_SAFE_AREA_PADDING = 16;

    private static readonly DEFAULT_SCROLLABLE_ELEMENT: HTMLElement | null =
      null;

    protected get scrollFadeSafeAreaPadding() {
      return ScrollableFadeClass.DEFAULT_SAFE_AREA_PADDING;
    }

    protected get scrollableElement(): HTMLElement | null {
      return ScrollableFadeClass.DEFAULT_SCROLLABLE_ELEMENT;
    }

    protected firstUpdated(changedProperties: PropertyValues) {
      super.firstUpdated?.(changedProperties);
      this._attachScrollableElement();
    }

    protected updated(changedProperties: PropertyValues) {
      super.updated?.(changedProperties);
      this._attachScrollableElement();
    }

    disconnectedCallback() {
      this._detachScrollableElement();
      super.disconnectedCallback();
    }

    protected renderScrollableFades(rounded = false): TemplateResult {
      return html`
        <div
          class=${classMap({
            "fade-top": true,
            rounded,
            visible: this._contentScrolled,
          })}
        ></div>
        <div
          class=${classMap({
            "fade-bottom": true,
            rounded,
            visible: this._contentScrollable,
          })}
        ></div>
      `;
    }

    static get styles() {
      const superCtor = Object.getPrototypeOf(this) as
        | typeof LitElement
        | undefined;
      const inheritedStyles = stylesArray(
        (superCtor?.styles ?? []) as CSSResultGroup | CSSResultGroup[]
      );
      return [...inheritedStyles, scrollableFadeStyles];
    }

    private _attachScrollableElement() {
      const element = this.scrollableElement;
      if (element === this._scrollTarget) {
        return;
      }
      this._detachScrollableElement();
      if (!element) {
        return;
      }
      this._scrollTarget = element;
      element.addEventListener("scroll", this._onScroll, { passive: true });
      this._resize.observe(element);
      this._updateScrollableState(element);
    }

    private _detachScrollableElement() {
      if (!this._scrollTarget) {
        return;
      }
      this._scrollTarget.removeEventListener("scroll", this._onScroll);
      this._resize.unobserve?.(this._scrollTarget);
      this._scrollTarget = undefined;
    }

    private _updateScrollableState(element: HTMLElement) {
      const safeAreaInsetBottom =
        parseFloat(
          getComputedStyle(element).getPropertyValue("--safe-area-inset-bottom")
        ) || 0;
      const { scrollHeight = 0, clientHeight = 0, scrollTop = 0 } = element;
      this._contentScrollable =
        scrollHeight - clientHeight >
        scrollTop + safeAreaInsetBottom + this.scrollFadeSafeAreaPadding;
    }
  }

  return ScrollableFadeClass;
};
