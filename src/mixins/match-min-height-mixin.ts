import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { LitElement, PropertyValues } from "lit";
import { state } from "lit/decorators";
import type { StyleInfo } from "lit/directives/style-map";
import type { Constructor } from "../types";

/**
 * Public interface added by {@link MatchMinHeightMixin}.
 *
 * Declared separately so consumers can reference the mixin's contributed
 * members in their own type annotations, per the Lit mixin authoring guide.
 */
export declare class MatchMinHeightMixinInterface {
  /** Most recently observed height of `matchMinHeightTarget`, in pixels. */
  protected _matchedMinHeight?: number;

  /**
   * `StyleInfo` exposing the matched height as a `min-height` declaration.
   * Pass to `styleMap` to keep a layout at least as tall as the target
   * element. Empty until a height has been observed.
   */
  protected get _matchMinHeightStyle(): StyleInfo;

  /**
   * Element whose height should be matched as a `min-height` floor. Override
   * with a getter that returns a `@query` result. Return `null` to pause
   * observation (e.g. while the element is not rendered).
   */
  protected get matchMinHeightTarget(): HTMLElement | null;
}

/**
 * Mixin that observes a target element's height and exposes it as a
 * `min-height` style. Useful for keeping a sibling layout (e.g. a YAML
 * editor) at least as tall as another (e.g. a UI form) to avoid content
 * shift when toggling between them.
 *
 * Subclasses override `matchMinHeightTarget` (typically returning a
 * `@query`-decorated element) to specify which element to observe.
 */
export const MatchMinHeightMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class MatchMinHeightMixinClass extends superClass {
    @state() protected _matchedMinHeight?: number;

    private _matchTarget: HTMLElement | null = null;

    private _matchResize = new ResizeController(this, {
      target: null,
      callback: (entries) => {
        const height = entries[0]?.contentRect.height;
        if (height) {
          this._matchedMinHeight = height;
        }
      },
    });

    private static readonly DEFAULT_MATCH_TARGET: HTMLElement | null = null;

    protected get matchMinHeightTarget(): HTMLElement | null {
      return MatchMinHeightMixinClass.DEFAULT_MATCH_TARGET;
    }

    protected get _matchMinHeightStyle(): StyleInfo {
      return this._matchedMinHeight !== undefined
        ? { "min-height": `${this._matchedMinHeight}px` }
        : {};
    }

    protected firstUpdated(changedProperties: PropertyValues<this>) {
      super.firstUpdated?.(changedProperties);
      this._attachMatchTarget();
    }

    protected updated(changedProperties: PropertyValues<this>) {
      super.updated?.(changedProperties);
      this._attachMatchTarget();
    }

    public disconnectedCallback() {
      this._detachMatchTarget();
      super.disconnectedCallback();
    }

    private _attachMatchTarget() {
      const element = this.matchMinHeightTarget;
      if (element === this._matchTarget) {
        return;
      }
      this._detachMatchTarget();
      if (!element) {
        return;
      }
      this._matchTarget = element;
      this._matchResize.observe(element);
    }

    private _detachMatchTarget() {
      if (!this._matchTarget) {
        return;
      }
      this._matchResize.unobserve?.(this._matchTarget);
      this._matchTarget = null;
    }
  }

  return MatchMinHeightMixinClass as unknown as Constructor<MatchMinHeightMixinInterface> &
    T;
};
