import { TemplateResult, html } from "lit-html";
import { LitElement, CSSResult, css, property } from "lit-element";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-input/paper-input";
import "@material/mwc-button";

class HassioSearchInput extends LitElement {
  @property() private filter?: string;

  protected render(): TemplateResult | void {
    return html`
      <div class="search-container">
        <iron-icon icon="hassio:magnify"></iron-icon>
        <paper-input
          no-label-float
          label="Search"
          .value=${this.filter}
          @value-changed=${(e) => this._filterChanged(e.target.value)}
        ></paper-input>
        <mwc-button @click=${() => this._filterChanged("")}>Clear</mwc-button>
      </div>
    `;
  }

  private async _filterChanged(value) {
    this.dispatchEvent(
      new CustomEvent("filter-changed", {
        detail: {
          value: String(value),
        },
      })
    );
  }

  static get styles(): CSSResult {
    return css`
      iron-icon {
        display: inline-block;
        margin-right: 16px;
        color: var(--primary-text-color);
      }
      paper-input {
        display: inline-block;
        flex: 1 1 auto;
        margin-right: 16px;
      }
      .search-container {
        display: inline-flex;
        width: calc(100% - 48px);
        padding: 8px 16px;
        align-items: center;
      }
    `;
  }
}

customElements.define("hassio-search-input", HassioSearchInput);
