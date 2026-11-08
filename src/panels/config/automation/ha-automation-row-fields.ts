import type { ContextType } from "@lit/context";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ensureArray } from "../../../common/array/ensure-array";
import { consume } from "../../../common/decorators/consume";
import type { PlatformCondition } from "../../../data/automation";
import {
  getConditionDomain,
  getConditionObjectId,
  type ConditionDescription,
} from "../../../data/condition";
import {
  formattersContext,
  internationalizationContext,
  registriesContext,
  statesContext,
} from "../../../data/context";
import { formatSelectorValue } from "../../../data/selector/format_selector_value";
import { rowSummaryStyles } from "./styles";

@customElement("ha-automation-row-fields")
export class HaAutomationRowFields extends LitElement {
  @property({ attribute: false }) public config!: PlatformCondition;

  @property({ attribute: false }) public description?: ConditionDescription;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    this.toggleAttribute("hidden", !this._labels().length);
  }

  protected render() {
    const labels = this._labels();
    return labels.length
      ? html`<span class="dot-separator"></span>${labels.join(", ")}`
      : nothing;
  }

  private _labels(): string[] {
    const fields = Object.entries(this.description?.fields || {}).filter(
      ([name, field]) =>
        field.selector &&
        !("numeric_threshold" in field.selector) &&
        !("automation_behavior" in field.selector) &&
        name !== "for" &&
        name !== "offset"
    );
    const domain = getConditionDomain(this.config.condition);
    const condition = getConditionObjectId(this.config.condition);
    const targetId = ensureArray(this.config.target?.entity_id || [])[0];
    const target = targetId ? this._states[targetId] : undefined;
    return fields.flatMap(([name, field]) => {
      const value = this.config.options?.[name];
      const selector = field.selector!;
      if (value == null) {
        return [];
      }
      let label: string;
      if ("select" in selector || "state" in selector) {
        label = ensureArray(value)
          .map((item: unknown) => {
            const text = String(item);
            if ("select" in selector) {
              const key = selector.select?.translation_key;
              const option = selector.select?.options.find((entry) =>
                typeof entry === "string"
                  ? entry === text
                  : entry.value === text
              );
              return (
                (key &&
                  this._i18n.localize(
                    `component.${domain}.selector.${key}.options.${text}`
                  )) ||
                (typeof option === "object" ? option.label : text)
              );
            }
            const extra = selector.state?.extra_options?.find(
              (entry) => entry.value === item
            );
            if (extra) {
              return extra.label;
            }
            const entityId = ensureArray(selector.state?.entity_id || [])[0];
            const entity = entityId ? this._states[entityId] : target;
            if (!entity) {
              return text;
            }
            return selector.state?.attribute
              ? this._formatters.formatEntityAttributeValue(
                  entity,
                  selector.state.attribute,
                  item
                )
              : this._formatters.formatEntityState(entity, text);
          })
          .join(", ");
      } else {
        label = formatSelectorValue(
          {
            ...this._i18n,
            ...this._registries,
            states: this._states,
            formatEntityName: this._formatters.formatEntityName,
          },
          value,
          selector
        );
      }
      if (!label) {
        return [];
      }
      const fieldLabel =
        fields.length > 1
          ? this._i18n.localize(
              `component.${domain}.conditions.${condition}.fields.${name}.name`
            ) || name
          : undefined;
      return [fieldLabel ? `${fieldLabel}: ${label}` : label];
    });
  }

  static styles = rowSummaryStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-fields": HaAutomationRowFields;
  }
}
