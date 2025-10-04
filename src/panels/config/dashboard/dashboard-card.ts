import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-ripple";

@customElement("dashboard-card")
export class DashboardCard extends LitElement {
  @property({ type: String }) name = "";

  @property({ type: String }) description = "";

  @property({ type: String }) img = "";

  @property({ type: String }) alt = "";

  render() {
    return html`
      <div
        class="card"
        tabindex="0"
        role="button"
        aria-label=${this.name}
        @keydown=${this._onKeyDown}
      >
        <div class="card-header">
          <div>
            <h2>${this.name}</h2>
            <p>${this.description}</p>
          </div>
        </div>
        <div class="preview">
          <img alt=${this.alt} loading="lazy" src=${this.img} />
        </div>
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  private _onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.click();
    }
  }

  static styles = css`
    .card {
      height: 100%;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      border-radius: var(--ha-border-radius-lg);
      background: var(--primary-background-color, #fafafa);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      border: 1px solid var(--divider-color);
    }
    .card-header {
      padding: 12px;
      display: block;
      text-align: var(--float-start);
      gap: var(--ha-space-2);
    }
    .preview {
      padding: 16px;
    }
    h2 {
      margin: 0 0 8px 0;
      font-size: 1.2rem;
      color: var(--primary-text-color);
    }
    p {
      margin: 0;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dashboard-card": DashboardCard;
  }
}
