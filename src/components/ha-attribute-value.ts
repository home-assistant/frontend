import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { getValueAttribute } from "../common/entity/get_states";
import { formattersContext } from "../data/context";

const isObjectValue = (value: unknown): boolean =>
  (Array.isArray(value) && value.some((val) => val instanceof Object)) ||
  (!Array.isArray(value) && value instanceof Object);

@customElement("ha-attribute-value")
class HaAttributeValue extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters?: ContextType<typeof formattersContext>;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property() public attribute!: string;

  @property({ type: Boolean, attribute: "hide-unit" }) public hideUnit = false;

  @state() private _yaml?: string;

  // Dumping the value to YAML in render() created a new promise (and a `until()`
  // directive chain) on every render. Resolve it into state instead, guarded so
  // only the latest resolution wins.
  private _yamlRequest = 0;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj") || changedProps.has("attribute")) {
      this._loadYaml();
    }
  }

  private async _loadYaml(): Promise<void> {
    const attributeValue = this.stateObj?.attributes[this.attribute];
    if (!isObjectValue(attributeValue)) {
      this._yaml = undefined;
      return;
    }
    const request = ++this._yamlRequest;
    const { dump } = await import("js-yaml");
    if (request === this._yamlRequest) {
      this._yaml = dump(attributeValue);
    }
  }

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
          if (url.protocol === "http:" || url.protocol === "https:") {
            return html`
              <a
                target="_blank"
                rel="noopener noreferrer"
                href=${attributeValue}
              >
                ${attributeValue}
              </a>
            `;
          }
        } catch {
          // Nothing to do here
        }
      }
    }

    if (isObjectValue(attributeValue)) {
      return html`<pre>${this._yaml ?? ""}</pre>`;
    }

    // Options-list attributes (effect_list, preset_modes, …) translated through
    // their value attribute, or the main state for lists like hvac_modes.
    if (Array.isArray(attributeValue)) {
      const domain = computeStateDomain(this.stateObj);
      const valueAttribute = getValueAttribute(domain, this.attribute);
      if (valueAttribute) {
        return attributeValue
          .map((item) =>
            valueAttribute === "_"
              ? this._formatters!.formatEntityState(this.stateObj!, item)
              : this._formatters!.formatEntityAttributeValue(
                  this.stateObj!,
                  valueAttribute,
                  item
                )
          )
          .join(", ");
      }
    }

    if (this.hideUnit) {
      const parts = this._formatters!.formatEntityAttributeValueToParts(
        this.stateObj!,
        this.attribute
      );
      return parts
        .filter((part) => part.type === "value")
        .map((part) => part.value)
        .join("");
    }

    return this._formatters!.formatEntityAttributeValue(
      this.stateObj!,
      this.attribute
    );
  }

  static styles = css`
    pre {
      font-family: inherit;
      font-size: inherit;
      margin: 0;
      overflow-wrap: break-word;
      white-space: pre-line;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attribute-value": HaAttributeValue;
  }
}
