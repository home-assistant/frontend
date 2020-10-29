import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { until } from "lit-html/directives/until";
import hassAttributeUtil from "../util/hass-attributes-util";

let jsYamlPromise: Promise<typeof import("js-yaml")>;

@customElement("ha-attributes")
class HaAttributes extends LitElement {
  @property() public stateObj?: HassEntity;

  @property({ attribute: "extra-filters" }) public extraFilters?: string;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    return html`
      <div>
        ${this.computeDisplayAttributes(
          Object.keys(hassAttributeUtil.LOGIC_STATE_ATTRIBUTES).concat(
            this.extraFilters ? this.extraFilters.split(",") : []
          )
        ).map(
          (attribute) => html`
            <div class="data-entry">
              <div class="key">
                ${attribute.replace(/_/g, " ").replace(/\bid\b/g, "ID")}
              </div>
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
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .data-entry {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }
      .data-entry .value {
        max-width: 200px;
        overflow-wrap: break-word;
        text-align: right;
      }
      .key:first-letter {
        text-transform: capitalize;
      }
      .attribution {
        color: var(--secondary-text-color);
        text-align: center;
      }
      pre {
        font-family: inherit;
        font-size: inherit;
      }
    `;
  }

  private computeDisplayAttributes(filtersArray: string[]): string[] {
    if (!this.stateObj) {
      return [];
    }
    return Object.keys(this.stateObj.attributes).filter((key) => {
      return filtersArray.indexOf(key) === -1;
    });
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
    if (
      (Array.isArray(value) && value.some((val) => val instanceof Object)) ||
      (!Array.isArray(value) && value instanceof Object)
    ) {
      if (!jsYamlPromise) {
        jsYamlPromise = import(/* webpackChunkName: "js-yaml" */ "js-yaml");
      }
      const yaml = jsYamlPromise.then((jsYaml) => jsYaml.safeDump(value));
      return html` <pre>${until(yaml, "")}</pre> `;
    }
    return Array.isArray(value) ? value.join(", ") : value;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attributes": HaAttributes;
  }
}
