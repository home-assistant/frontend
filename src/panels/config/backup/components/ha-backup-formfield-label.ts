import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-svg-icon";

@customElement("ha-backup-formfield-label")
class SupervisorFormfieldLabel extends LitElement {
  @property({ type: String }) public label!: string;

  @property({ type: String, attribute: "image-url" }) public imageUrl?: string;

  @property({ type: String, attribute: "icon-path" }) public iconPath?: string;

  @property({ type: String }) public version?: string;

  protected render(): TemplateResult {
    return html`
      ${this.imageUrl
        ? html`<img loading="lazy" alt="" src=${this.imageUrl} class="icon" />`
        : this.iconPath
          ? html`
              <ha-svg-icon .path=${this.iconPath} class="icon"></ha-svg-icon>
            `
          : nothing}
      <span class="label">
        ${this.label}
        ${this.version
          ? html`<span class="version">(${this.version})</span>`
          : nothing}
      </span>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: row;
      gap: 16px;
      align-items: center;
    }
    .label {
      margin-right: 4px;
      margin-inline-end: 4px;
      margin-inline-start: initial;
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-normal);
      letter-spacing: 0.5px;
    }
    .version {
      color: var(--secondary-text-color);
    }
    .icon {
      --mdi-icon-size: 24px;
      width: 24px;
      height: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-formfield-label": SupervisorFormfieldLabel;
  }
}
