import {
  css,
  CSSResultGroup,
  LitElement,
  nothing,
  svg,
  SVGTemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { DirectiveResult } from "lit/directive";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

@customElement("ha-svg-icon")
export class HaSvgIcon extends LitElement {
  @property() public paths?: SvgPath[];

  @property() public viewBox?: string;

  // For backward compatibility with unique path icons
  @property()
  public set path(path: string | undefined) {
    if (path !== undefined) {
      this.paths = [
        {
          value: path,
        } as SvgPath,
      ];
    } else {
      this.paths = undefined;
    }
  }

  // For backward compatibility with unique path icons
  public get path(): string | undefined {
    return this.paths?.map((path) => path.value).join("\n");
  }

  protected render(): SVGTemplateResult {
    return svg`
    <svg
      viewBox=${this.viewBox || "0 0 24 24"}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      role="img"
      aria-hidden="true"
    >
      <g>
      ${this.renderPaths()}
      </g>
    </svg>`;
  }

  protected renderPaths(): DirectiveResult[] | SVGTemplateResult {
    return this.paths !== undefined
      ? this.paths.map((path) => this.renderPath(path))
      : svg`${nothing}`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: var(--ha-icon-display, inline-flex);
        align-items: center;
        justify-content: center;
        position: relative;
        vertical-align: middle;
        fill: currentcolor;
        width: var(--mdc-icon-size, 24px);
        height: var(--mdc-icon-size, 24px);
      }
      svg {
        width: 100%;
        height: 100%;
        pointer-events: none;
        display: block;
      }
    `;
  }

  protected renderPath(path: SvgPath): DirectiveResult {
    return unsafeSVG(
      `<path d="${path.value}" ${
        path.attributes !== undefined
          ? Object.entries(path.attributes)
              .map(([key, value]) => `${key}="${value}"`)
              .join(" ")
          : ""
      }></path>`
    );
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-svg-icon": HaSvgIcon;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path#attributes
export interface SvgPath {
  value: string;
  attributes?: {
    [key: string]: string;
  };
}
