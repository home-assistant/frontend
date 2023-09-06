import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeAttributeNameDisplay } from "../common/entity/compute_attribute_display";
import { STATE_ATTRIBUTES } from "../data/entity_attributes";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";
import "./ha-attribute-value";
import "./ha-expansion-panel";

@customElement("ha-attributes")
class HaAttributes extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  @property({ attribute: "extra-filters" }) public extraFilters?: string;

  @state() private _expanded = false;

  private get _filteredAttributes() {
    return this.computeDisplayAttributes(
      STATE_ATTRIBUTES.concat(
        this.extraFilters ? this.extraFilters.split(",") : []
      )
    );
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (
      changedProperties.has("extraFilters") ||
      changedProperties.has("stateObj")
    ) {
      this.toggleAttribute("empty", this._filteredAttributes.length === 0);
    }
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const attributes = this._filteredAttributes;

    if (attributes.length === 0) {
      return nothing;
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
                      <div class="key">
                        ${computeAttributeNameDisplay(
                          this.hass.localize,
                          this.stateObj!,
                          this.hass.entities,
                          attribute
                        )}
                      </div>
                      <div class="value">
                        <ha-attribute-value
                          .hass=${this.hass}
                          .attribute=${attribute}
                          .stateObj=${this.stateObj}
                        ></ha-attribute-value>
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

  private expandedChanged(ev) {
    this._expanded = ev.detail.expanded;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attributes": HaAttributes;
  }
}
