import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../src/components/ha-svg-icon";

@customElement("supervisor-formfield-label")
class SupervisorFormfieldLabel extends LitElement {
  @property({ type: String }) public label!: string;

  @property({ attribute: false }) public imageUrl?: string;

  @property({ attribute: false }) public iconPath?: string;

  @property({ type: String }) public version?: string;

  protected render(): TemplateResult {
    return html`
      ${this.imageUrl
        ? html`<img loading="lazy" alt="" src=${this.imageUrl} class="icon" />`
        : this.iconPath
          ? html`<ha-svg-icon
              .path=${this.iconPath}
              class="icon"
            ></ha-svg-icon>`
          : ""}
      <span class="label">${this.label}</span>
      ${this.version
        ? html`<span class="version">(${this.version})</span>`
        : ""}
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
    }
    .label {
      margin-right: 4px;
      margin-inline-end: 4px;
      margin-inline-start: initial;
    }
    .version {
      color: var(--secondary-text-color);
    }
    .icon {
      max-height: 22px;
      max-width: 22px;
      margin-right: 8px;
      margin-inline-end: 8px;
      margin-inline-start: initial;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-formfield-label": SupervisorFormfieldLabel;
  }
}
