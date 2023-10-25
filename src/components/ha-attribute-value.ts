import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { formatNumber } from "../common/number/format_number";
import { HomeAssistant } from "../types";

@customElement("ha-attribute-value")
class HaAttributeValue extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  @property() public attribute!: string;

  @property({ type: Boolean, attribute: "hide-unit" })
  public hideUnit?: boolean;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const attributeValue = this.stateObj.attributes[this.attribute];

    if (typeof attributeValue === "number" && this.hideUnit) {
      return formatNumber(attributeValue, this.hass.locale);
    }

    if (typeof attributeValue === "string") {
      // URL handling
      if (attributeValue.startsWith("http")) {
        try {
          // If invalid URL, exception will be raised
          const url = new URL(attributeValue);
          if (url.protocol === "http:" || url.protocol === "https:")
            return html`
              <a
                target="_blank"
                rel="noopener noreferrer"
                href=${attributeValue}
              >
                ${attributeValue}
              </a>
            `;
        } catch {
          // Nothing to do here
        }
      }
    }

    if (
      (Array.isArray(attributeValue) &&
        attributeValue.some((val) => val instanceof Object)) ||
      (!Array.isArray(attributeValue) && attributeValue instanceof Object)
    ) {
      const yaml = import("js-yaml").then(({ dump }) => dump(attributeValue));
      return html`<pre>${until(yaml, "")}</pre>`;
    }

    return this.hass.formatEntityAttributeValue(this.stateObj!, this.attribute);
  }

  static styles = css`
    pre {
      margin: 0;
      white-space: pre-wrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attribute-value": HaAttributeValue;
  }
}
