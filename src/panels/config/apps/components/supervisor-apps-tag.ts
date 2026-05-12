import "@home-assistant/webawesome/dist/components/tag/tag";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-svg-icon";

@customElement("supervisor-apps-tag")
class SupervisorAppsTag extends LitElement {
  @property() public variant:
    | "brand"
    | "success"
    | "warning"
    | "danger"
    | "neutral" = "neutral";

  @property({ attribute: "icon-path" }) public iconPath?: string;

  @property() public label!: string;

  protected render(): TemplateResult {
    return html`<wa-tag .variant=${this.variant}>
      ${this.iconPath
        ? html`<ha-svg-icon .path=${this.iconPath}></ha-svg-icon>`
        : nothing}
      ${this.label}
    </wa-tag>`;
  }

  static styles = css`
    wa-tag {
      font-size: var(--ha-font-size-xs);
      border-radius: var(--ha-border-radius-pill);
      height: 20px;
      border: none;
      padding-inline: var(--ha-space-1) var(--ha-space-2);
    }
    wa-tag ha-svg-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }
    wa-tag[variant="success"] {
      color: var(--ha-color-on-success-normal);
    }
    wa-tag[variant="warning"] {
      color: var(--ha-color-on-warning-normal);
    }
    wa-tag[variant="danger"] {
      color: var(--ha-color-on-error-normal);
    }
    wa-tag[variant="neutral"] {
      color: var(--ha-color-on-neutral-normal);
    }
    wa-tag[variant="brand"] {
      color: var(--ha-color-on-primary-normal);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-apps-tag": SupervisorAppsTag;
  }
}
