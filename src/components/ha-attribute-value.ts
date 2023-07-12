import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { computeAttributeValueDisplay } from "../common/entity/compute_attribute_display";
import { HomeAssistant } from "../types";
import "./ha-expansion-panel";

let jsYamlPromise: Promise<typeof import("../resources/js-yaml-dump")>;

@customElement("ha-attribute-value")
class HaAttributeValue extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  @property() public attribute!: string;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const attributeValue = this.stateObj.attributes[this.attribute];
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
        } catch (_) {
          // Nothing to do here
        }
      }
    }

    if (
      (Array.isArray(attributeValue) &&
        attributeValue.some((val) => val instanceof Object)) ||
      (!Array.isArray(attributeValue) && attributeValue instanceof Object)
    ) {
      if (!jsYamlPromise) {
        jsYamlPromise = import("../resources/js-yaml-dump");
      }
      const yaml = jsYamlPromise.then((jsYaml) => jsYaml.dump(attributeValue));
      return html`<pre>${until(yaml, "")}</pre>`;
    }

    return computeAttributeValueDisplay(
      this.hass.localize,
      this.stateObj!,
      this.hass.locale,
      this.hass.config,
      this.hass.entities,
      this.attribute
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attribute-value": HaAttributeValue;
  }
}
