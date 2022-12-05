import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  formatAttributeName,
  formatAttributeValue,
  STATE_ATTRIBUTES,
} from "../data/entity_attributes";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";

import "./ha-expansion-panel";

@customElement("ha-attributes")
class HaAttributes extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  @property({ attribute: "extra-filters" }) public extraFilters?: string;

  @state() private _expanded = false;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    const attributes = this.computeDisplayAttributes(
      STATE_ATTRIBUTES.concat(
        this.extraFilters ? this.extraFilters.split(",") : []
      )
    );
    if (attributes.length === 0) {
      return html``;
    }

    return html`
      <ha-expansion-panel
        .header=${this.hass.localize(
          "ui.components.attributes.expansion_header"
        )}
        outlined
        @expanded-will-change=${this.expandedChanged}
      >
        <div class="attribute-container">
          ${this._expanded
            ? html`
                ${attributes.map(
                  (attribute) => html`
                    <div class="data-entry">
                      <div class="key">${formatAttributeName(attribute)}</div>
                      <div class="value">
                        ${this.formatAttribute(attribute)}
                      </div>
                    </div>
                  `
                )}
              `
            : ""}
        </div>
      </ha-expansion-panel>
      ${this.stateObj.attributes.attribution
        ? html`
            <div class="attribution">
              ${this.stateObj.attributes.attribution}
            </div>
          `
        : ""}
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .attribute-container {
          margin-bottom: 8px;
          direction: ltr;
        }
        .data-entry {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        .data-entry .value {
          max-width: 60%;
          overflow-wrap: break-word;
          text-align: right;
        }
        .key {
          flex-grow: 1;
        }
        .attribution {
          color: var(--secondary-text-color);
          text-align: center;
          margin-top: 16px;
        }
        pre {
          font-family: inherit;
          font-size: inherit;
          margin: 0px;
          overflow-wrap: break-word;
          white-space: pre-line;
        }
        hr {
          border-color: var(--divider-color);
          border-bottom: none;
          margin: 16px 0;
        }
      `,
    ];
  }

  private computeDisplayAttributes(filtersArray: string[]): string[] {
    if (!this.stateObj) {
      return [];
    }
    return Object.keys(this.stateObj.attributes).filter(
      (key) => filtersArray.indexOf(key) === -1
    );
  }

  private formatAttribute(attribute: string): string | TemplateResult {
    if (!this.stateObj) {
      return "—";
    }
    const value = this.stateObj.attributes[attribute];
    return formatAttributeValue(this.hass, value);
  }

  private expandedChanged(ev) {
    this._expanded = ev.detail.expanded;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attributes": HaAttributes;
  }
}
