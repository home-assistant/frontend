import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../src/components/ha-svg-icon";

@customElement("supervisor-formfield-label")
class SupervisorFormfieldLabel extends LitElement {
  @property({ type: String }) public label!: string;

  @property({ type: String }) public imageUrl?: string;

  @property({ type: String }) public iconPath?: string;

  @property({ type: String }) public version?: string;

  protected render(): TemplateResult {
    return html`
      ${this.imageUrl
        ? html`<img loading="lazy" alt="" src=${this.imageUrl} class="icon" />`
        : this.iconPath
        ? html`<ha-svg-icon .path=${this.iconPath} class="icon"></ha-svg-icon>`
        : ""}
      <span class="label">${this.label}</span>
      ${this.version
        ? html`<span class="version">(${this.version})</span>`
        : ""}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        align-items: center;
      }
      .label {
        margin-right: 4px;
      }
      .version {
        color: var(--secondary-text-color);
      }
      .icon {
        max-height: 22px;
        max-width: 22px;
        margin-right: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-formfield-label": SupervisorFormfieldLabel;
  }
}
