import type { ContextType } from "@lit/context";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../common/array/ensure-array";
import { consume } from "../../../common/decorators/consume";
import { createDurationData } from "../../../common/datetime/create_duration_data";
import { formatDurationNarrow } from "../../../common/datetime/format_duration";
import { normalizeDuration } from "../../../common/datetime/normalize_duration";
import { hasTemplate } from "../../../common/string/has-template";
import type { ForDict, PlatformCondition } from "../../../data/automation";
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

const SUMMARY_UNITS = {
  enableDay: true,
  enableSecond: true,
  enableMillisecond: true,
};

interface HaAutomationRowOptionsConfig {
  condition?: string;
  target?: PlatformCondition["target"];
  options?: {
    [key: string]: unknown;
    for?: string | number | ForDict;
    offset?: string | number | ForDict;
  };
  timeout?: string | number | ForDict;
}

@customElement("ha-automation-row-options")
export class HaAutomationRowOptions extends LitElement {
  @property({ attribute: false }) public config!: HaAutomationRowOptionsConfig;

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

  protected render() {
    const supportedOptions = this._getLabels();

    if (!supportedOptions.length) {
      return nothing;
    }

    return html`<span class="dot-separator"></span
      >${supportedOptions.join(", ")}`;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    // Collapse the host when empty so the parent flex gap is not reserved.
    this.toggleAttribute("hidden", !this._getLabels().length);
  }

  private _getLabels(): string[] {
    return [
      ...this._formatFields(),
      ...this._formatOptions(this.config, this._i18n),
    ];
  }

  private _formatOptions = memoizeOne(
    (
      config: HaAutomationRowOptionsConfig,
      _i18n: typeof this._i18n
    ): string[] => {
      const parts: string[] = [];

      if ("options" in config && config.options) {
        const options = config.options;

        const forDuration = this._duration(options.for);
        if (forDuration) {
          parts.push(
            this._i18n.localize(
              "ui.panel.config.automation.editor.row_options.for",
              {
                duration: forDuration.text,
              }
            )
          );
        }

        const offset = this._duration(options.offset);
        if (offset) {
          parts.push(
            this._i18n.localize(
              `ui.panel.config.automation.editor.row_options.offset_${offset.negative ? "before" : "after"}`,
              { offset: offset.text }
            )
          );
        }
      }

      if ("timeout" in config) {
        const timeoutDuration = this._duration(config.timeout);
        if (timeoutDuration) {
          parts.push(
            this._i18n.localize(
              "ui.panel.config.automation.editor.row_options.timeout",
              { duration: timeoutDuration.text }
            )
          );
        }
      }

      return parts;
    }
  );

  private _formatFields(): string[] {
    if (!this.config.condition || !this.description) {
      return [];
    }
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

  private _duration(
    value: unknown
  ): { negative: boolean; text: string } | undefined {
    if (value === undefined || hasTemplate(value)) {
      return undefined;
    }
    const duration = createDurationData(
      value as string | number | ForDict | undefined
    );
    if (
      !duration ||
      Object.values(duration).some(
        (part) => part !== undefined && !Number.isFinite(part)
      )
    ) {
      return undefined;
    }
    const normalized = normalizeDuration(duration, SUMMARY_UNITS);
    const text = formatDurationNarrow(this._i18n.locale, normalized.duration);
    return text ? { negative: normalized.negative, text } : undefined;
  }

  static styles = rowSummaryStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-options": HaAutomationRowOptions;
  }
}
