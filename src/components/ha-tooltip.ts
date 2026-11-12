import Tooltip from "@home-assistant/webawesome/dist/components/tooltip/tooltip";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-tooltip")
export class HaTooltip extends Tooltip {
  /** The amount of time to wait before showing the tooltip when the user mouses in. */
  @property({ attribute: "show-delay", type: Number }) showDelay = 350;

  /** The amount of time to wait before hiding the tooltip when the user mouses out.. */
  @property({ attribute: "hide-delay", type: Number }) hideDelay = 150;

  /** Use the tooltip as supplemental help instead of the anchor's name. */
  @property({ attribute: "describe-anchor", type: Boolean }) describeAnchor =
    false;

  public handleForChange(): void {
    if (this.anchor && this.describeAnchor) {
      this._removeDescription(this.anchor);
    }
    super.handleForChange();
    // Web Awesome associates the tooltip as a label when resolving its anchor.
    // Move only our ID to the description, preserving other ARIA references.
    this._updateAnchorDescription();
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (changedProperties.has("describeAnchor")) {
      this._updateAnchorDescription();
    }
  }

  public disconnectedCallback(): void {
    if (this.anchor && this.describeAnchor) {
      this._removeDescription(this.anchor);
    }
    super.disconnectedCallback();
  }

  private _updateAnchorDescription(): void {
    if (!this.anchor) {
      return;
    }
    const removeAttribute = this.describeAnchor
      ? "aria-labelledby"
      : "aria-describedby";
    const addAttribute = this.describeAnchor
      ? "aria-describedby"
      : "aria-labelledby";
    const ids = this.anchor
      .getAttribute(removeAttribute)
      ?.split(/\s+/)
      .filter((id) => id && id !== this.id);
    if (ids?.length) {
      this.anchor.setAttribute(removeAttribute, ids.join(" "));
    } else {
      this.anchor.removeAttribute(removeAttribute);
    }
    const descriptions = new Set(
      this.anchor.getAttribute(addAttribute)?.split(/\s+/).filter(Boolean)
    );
    descriptions.add(this.id);
    this.anchor.setAttribute(addAttribute, [...descriptions].join(" "));
  }

  private _removeDescription(anchor: Element): void {
    const ids = anchor
      .getAttribute("aria-describedby")
      ?.split(/\s+/)
      .filter((id) => id && id !== this.id);
    if (ids?.length) {
      anchor.setAttribute("aria-describedby", ids.join(" "));
    } else {
      anchor.removeAttribute("aria-describedby");
    }
  }

  static get styles(): CSSResultGroup {
    return [
      Tooltip.styles,
      css`
        :host {
          --wa-tooltip-background-color: var(
            --ha-tooltip-background-color,
            var(--ha-color-surface-default)
          );
          --wa-tooltip-content-color: var(
            --ha-tooltip-text-color,
            var(--primary-text-color)
          );
          --wa-tooltip-font-family: var(
            --ha-tooltip-font-family,
            var(--ha-font-family-body)
          );
          --wa-tooltip-font-size: var(
            --ha-tooltip-font-size,
            var(--ha-font-size-m)
          );
          --wa-tooltip-font-weight: var(
            --ha-tooltip-font-weight,
            var(--ha-font-weight-medium)
          );
          --wa-tooltip-line-height: var(
            --ha-tooltip-line-height,
            var(--ha-line-height-condensed)
          );
          --wa-tooltip-padding: var(--ha-tooltip-padding, var(--ha-space-2));
          --wa-tooltip-border-radius: var(
            --ha-tooltip-border-radius,
            var(--ha-border-radius-md)
          );
          --wa-tooltip-arrow-size: var(--ha-tooltip-arrow-size, 0px);
          --wa-tooltip-border-width: 0px;
          --wa-z-index-tooltip: 1000;
        }

        .tooltip::part(popup) {
          animation-duration: var(--ha-tooltip-animation-duration, 0);
        }

        .body {
          box-shadow: var(--ha-tooltip-box-shadow, var(--ha-box-shadow-m));
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tooltip": HaTooltip;
  }
}
