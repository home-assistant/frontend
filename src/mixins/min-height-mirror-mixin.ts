import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { LitElement, PropertyValues } from "lit";
import { state } from "lit/decorators";
import type { StyleInfo } from "lit/directives/style-map";
import type { Constructor } from "../types";

/**
 * Public interface added by {@link MinHeightMirrorMixin}.
 *
 * Declared separately so consumers can reference the mixin's contributed
 * members in their own type annotations, per the Lit mixin authoring guide.
 */
export declare class MinHeightMirrorMixinInterface {
  /** Most recently observed height of `minHeightMirrorTarget`, in pixels. */
  protected _mirroredMinHeight?: number;

  /**
   * `StyleInfo` exposing the mirrored height as a `min-height` declaration.
   * Spread into `styleMap` to keep a layout pinned to the target element's
   * height. Empty until a height has been observed.
   */
  protected get _minHeightMirrorStyle(): StyleInfo;

  /**
   * Element whose height should be mirrored as `min-height`. Override with a
   * getter that returns a `@query` result. Return `null` to pause observation
   * (e.g. while the element is not rendered).
   */
  protected get minHeightMirrorTarget(): HTMLElement | null;
}

/**
 * Mixin that observes a target element's height and exposes it as a
 * `min-height` style. Useful for keeping a sibling layout (e.g. a YAML
 * editor) at least as tall as another (e.g. a UI form) to avoid content
 * shift when toggling between them.
 *
 * Subclasses override `minHeightMirrorTarget` (typically returning a
 * `@query`-decorated element) to specify which element to observe.
 */
export const MinHeightMirrorMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class MinHeightMirrorMixinClass extends superClass {
    @state() protected _mirroredMinHeight?: number;

    private _mirrorTarget: HTMLElement | null = null;

    private _mirrorResize = new ResizeController(this, {
      target: null,
      callback: (entries) => {
        const height = entries[0]?.contentRect.height;
        if (height) {
          this._mirroredMinHeight = height;
        }
      },
    });

    private static readonly DEFAULT_MIRROR_TARGET: HTMLElement | null = null;

    protected get minHeightMirrorTarget(): HTMLElement | null {
      return MinHeightMirrorMixinClass.DEFAULT_MIRROR_TARGET;
    }

    protected get _minHeightMirrorStyle(): StyleInfo {
      return this._mirroredMinHeight !== undefined
        ? { "min-height": `${this._mirroredMinHeight}px` }
        : {};
    }

    protected firstUpdated(changedProperties: PropertyValues<this>) {
      super.firstUpdated?.(changedProperties);
      this._attachMirrorTarget();
    }

    protected updated(changedProperties: PropertyValues<this>) {
      super.updated?.(changedProperties);
      this._attachMirrorTarget();
    }

    public disconnectedCallback() {
      this._detachMirrorTarget();
      super.disconnectedCallback();
    }

    private _attachMirrorTarget() {
      const element = this.minHeightMirrorTarget;
      if (element === this._mirrorTarget) {
        return;
      }
      this._detachMirrorTarget();
      if (!element) {
        return;
      }
      this._mirrorTarget = element;
      this._mirrorResize.observe(element);
    }

    private _detachMirrorTarget() {
      if (!this._mirrorTarget) {
        return;
      }
      this._mirrorResize.unobserve?.(this._mirrorTarget);
      this._mirrorTarget = null;
    }
  }

  return MinHeightMirrorMixinClass as unknown as Constructor<MinHeightMirrorMixinInterface> &
    T;
};
