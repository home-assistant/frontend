import type { nothing, TemplateResult } from "lit";
import { css, html } from "lit";
import type {
  ChildPart,
  DirectiveParameters,
  DirectiveResult,
  PartInfo,
} from "lit/directive";
import { Directive, directive, PartType } from "lit/directive";

/* What a skeleton or its content can be rendered as */
type SkeletonOrValue =
  | TemplateResult
  | DirectiveResult
  | string
  | number
  | typeof nothing
  | null
  | undefined;

/**
 * Content that takes a skeleton's place fades in, so it doesn't pop in. It
 * runs at the same pace as `ha-skeleton-overlay`, `--ha-animation-duration-fast`,
 * which reduced motion makes instant.
 */

const ARRIVAL_KEYFRAMES: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

/**
 * Fade in an element that takes a skeleton's place but was already on the
 * page, such as a log that fills in while its skeleton shows.
 */
export const fadeInArrival = (element: Element) => {
  const duration =
    parseFloat(
      getComputedStyle(element).getPropertyValue("--ha-animation-duration-fast")
    ) || 150;

  element.animate(ARRIVAL_KEYFRAMES, { duration, easing: "ease-out" });
};

/**
 * For a whole block that replaces a skeleton: put the `arriving` class on it,
 * and it fades in once, when it first appears. Where it can appear again
 * without a skeleton before it, use `skeletonOr` instead.
 */
export const skeletonArrivalStyles = css`
  .arriving {
    animation: ha-skeleton-arrival var(--ha-animation-duration-fast, 150ms)
      ease-out;
  }
  @keyframes ha-skeleton-arrival {
    from {
      opacity: 0;
    }
  }
`;

class SkeletonOrDirective extends Directive {
  /* What this spot showed last time */
  private _showedSkeleton = false;

  /* Text needs an element to fade, so it's wrapped once it has arrived */
  private _wrapText = false;

  constructor(partInfo: PartInfo) {
    super(partInfo);

    if (partInfo.type !== PartType.CHILD) {
      throw new Error("skeletonOr can only be used in content bindings");
    }
  }

  public render(
    loading: boolean,
    skeleton: SkeletonOrValue,
    content: () => SkeletonOrValue
  ): SkeletonOrValue {
    if (loading) {
      return skeleton;
    }

    const value = content();

    return this._wrapText &&
      (typeof value === "string" || typeof value === "number")
      ? html`<span>${value}</span>`
      : value;
  }

  public update(
    part: ChildPart,
    [loading, skeleton, content]: DirectiveParameters<this>
  ) {
    const arriving = !loading && this._showedSkeleton;
    this._showedSkeleton = loading;

    if (arriving) {
      this._wrapText = true;

      // Fade in what was rendered, once it's on the page
      requestAnimationFrame(() => {
        let node = part.startNode?.nextSibling;

        while (node && node !== part.endNode) {
          if (node instanceof Element) {
            fadeInArrival(node);
          }

          node = node.nextSibling;
        }
      });
    }

    return this.render(loading, skeleton, content);
  }
}

/**
 * Shows `skeleton` while `loading`, then `content`. When this spot switches
 * from the skeleton to the content, the content fades in. A spot that never
 * showed a skeleton, such as a table row made as the table scrolls, shows its
 * content at once.
 *
 * Content that's only text is wrapped so it can fade. In a template, put text
 * in an element of its own, as only elements fade.
 */
export const skeletonOr = directive(SkeletonOrDirective);
