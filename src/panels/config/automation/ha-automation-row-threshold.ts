import { consume, type ContextType } from "@lit/context";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { blankBeforeUnit } from "../../../common/translations/blank_before_unit";
import type {
  NumericThresholdValue,
  ThresholdValueEntry,
} from "../../../components/ha-selector/ha-selector-numeric-threshold";
import type {
  PlatformCondition,
  PlatformTrigger,
} from "../../../data/automation";
import type { ConditionDescription } from "../../../data/condition";
import { internationalizationContext } from "../../../data/context";
import type { NumericThresholdSelector } from "../../../data/selector";
import type { TriggerDescription } from "../../../data/trigger";
import { rowSummaryStyles } from "./styles";

@customElement("ha-automation-row-threshold")
export class HaAutomationRowThreshold extends LitElement {
  @property({ attribute: false })
  public config!: PlatformTrigger | PlatformCondition;

  @property({ attribute: false })
  public description?: TriggerDescription | ConditionDescription;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    // Collapse the host when empty so the parent flex gap is not reserved.
    this.toggleAttribute(
      "hidden",
      !this._getLabel(
        this._getThreshold(this.config, this.description),
        this._i18n
      )
    );
  }

  protected render() {
    const label = this._getLabel(
      this._getThreshold(this.config, this.description),
      this._i18n
    );

    if (!label) {
      return nothing;
    }

    return html`<span class="dot-separator"></span>${label}`;
  }

  private _getThreshold = memoizeOne(
    (
      config: PlatformTrigger | PlatformCondition,
      description: TriggerDescription | ConditionDescription | undefined
    ) => {
      const fields = description?.fields;
      if (!fields || !config.options) {
        return undefined;
      }
      const entry = Object.entries(fields).find(
        ([, field]) => field.selector && "numeric_threshold" in field.selector
      );
      if (!entry) {
        return undefined;
      }
      const value = config.options[entry[0]] as
        NumericThresholdValue | undefined;
      if (!value?.type) {
        return undefined;
      }

      const threshold = (entry[1].selector as NumericThresholdSelector)
        .numeric_threshold;
      const fallbackUnit =
        threshold?.unit_of_measurement?.[0] ??
        threshold?.number?.unit_of_measurement;
      const withUnit = (bound?: ThresholdValueEntry) =>
        bound
          ? {
              ...bound,
              unit_of_measurement: bound.unit_of_measurement ?? fallbackUnit,
            }
          : bound;

      return {
        ...value,
        value: withUnit(value.value),
        value_min: withUnit(value.value_min),
        value_max: withUnit(value.value_max),
      };
    }
  );

  private _getLabel = memoizeOne(
    (threshold: NumericThresholdValue | undefined, i18n: typeof this._i18n) => {
      if (
        !threshold ||
        !threshold?.type ||
        threshold.type === "any" ||
        threshold.value?.active_choice === "entity" ||
        threshold.value_min?.active_choice === "entity" ||
        threshold.value_max?.active_choice === "entity"
      ) {
        return undefined;
      }

      if (threshold.type === "between" || threshold.type === "outside") {
        const min = threshold.value_min?.number;
        const max = threshold.value_max?.number;
        if (min === undefined || max === undefined) {
          return undefined;
        }

        const separateUnits =
          threshold.value_min?.unit_of_measurement !==
          threshold.value_max?.unit_of_measurement;

        const range = `${min}${separateUnits ? this._unit(threshold.value_min?.unit_of_measurement) : ""}-${max}${this._unit(threshold.value_max?.unit_of_measurement)}`;

        return i18n.localize(
          `ui.components.selectors.numeric_threshold.row_label.${threshold.type}`,
          { value: range }
        );
      }

      if (isNaN(Number(threshold.value?.number))) {
        return undefined;
      }
      return i18n.localize(
        `ui.components.selectors.numeric_threshold.row_label.${threshold.type}`,
        {
          value: `${threshold.value!.number}${this._unit(threshold.value!.unit_of_measurement ?? "")}`,
        }
      );
    }
  );

  private _unit(unit?: string): string {
    if (!unit) {
      return "";
    }
    return `${blankBeforeUnit(unit, this._i18n.locale)}${unit}`;
  }

  static styles = rowSummaryStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-threshold": HaAutomationRowThreshold;
  }
}
