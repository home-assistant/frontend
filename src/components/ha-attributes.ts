import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";
import hassAttributeUtil, {
  formatAttributeName,
} from "../util/hass-attributes-util";
import "./ha-expansion-panel";

let jsYamlPromise: Promise<typeof import("js-yaml")>;

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
      Object.keys(hassAttributeUtil.LOGIC_STATE_ATTRIBUTES).concat(
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
                ${this.stateObj.attributes.attribution
                  ? html`
                      <div class="attribution">
                        ${this.stateObj.attributes.attribution}
                      </div>
                    `
                  : ""}
              `
            : ""}
        </div>
      </ha-expansion-panel>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .attribute-container {
          margin-bottom: 8px;
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
      return "-";
    }
    const value = this.stateObj.attributes[attribute];
    return this.formatAttributeValue(value);
  }

  private formatAttributeValue(value: any): string | TemplateResult {
    if (value === null) {
      return "-";
    }
    // YAML handling
    if (
      (Array.isArray(value) && value.some((val) => val instanceof Object)) ||
      (!Array.isArray(value) && value instanceof Object)
    ) {
      if (!jsYamlPromise) {
        jsYamlPromise = import("js-yaml");
      }
      const yaml = jsYamlPromise.then((jsYaml) => jsYaml.safeDump(value));
      return html` <pre>${until(yaml, "")}</pre> `;
    }
    // URL handling
    if (typeof value === "string" && value.startsWith("http")) {
      try {
        // If invalid URL, exception will be raised
        const url = new URL(value);
        if (url.protocol === "http:" || url.protocol === "https:")
          return html`<a target="_blank" rel="noreferrer" href="${value}"
            >${value}</a
          >`;
      } catch (_) {
        // Nothing to do here
      }
    }
    return Array.isArray(value) ? value.join(", ") : value;
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
