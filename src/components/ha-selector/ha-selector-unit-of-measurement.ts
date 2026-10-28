import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { deepEqual } from "../../common/util/deep-equal";
import type { UnitOfMeasurementSelector } from "../../data/selector";
import { computeSelectorUnits } from "../../data/sensor/unit_of_measurement";
import "../ha-unit-of-measurement-picker";

@customElement("ha-selector-unit_of_measurement")
export class HaUnitOfMeasurementSelector extends LitElement {
  @property({ attribute: false }) public selector!: UnitOfMeasurementSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_device_class?: string | string[];
    filter_state_class?: string | string[];
  };

  private _units = memoizeOne(
    (
      deviceClasses: string | string[] | null | undefined,
      stateClasses: string | string[] | null | undefined,
      filterDeviceClass: string | string[] | undefined,
      filterStateClass: string | string[] | undefined
    ) =>
      computeSelectorUnits(
        { device_classes: deviceClasses, state_classes: stateClasses },
        {
          filter_device_class: filterDeviceClass,
          filter_state_class: filterStateClass,
        }
      )
  );

  private _getUnits() {
    return this._units(
      this.selector.unit_of_measurement?.device_classes,
      this.selector.unit_of_measurement?.state_classes,
      this.context?.filter_device_class,
      this.context?.filter_state_class
    );
  }

  protected render() {
    return html`
      <ha-unit-of-measurement-picker
        .value=${this.value}
        .units=${this._getUnits()}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-unit-of-measurement-picker>
    `;
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    if (!changedProps.has("context") && !changedProps.has("selector")) {
      return;
    }

    const units = this._getUnits();
    // Any unit is allowed
    if (units === undefined) {
      return;
    }

    if (this.value) {
      // Unselect a unit that the changed context no longer allows
      const oldContext = changedProps.get("context");
      if (
        oldContext !== undefined &&
        // Compare by value, so an equal list counts as unchanged
        (!deepEqual(
          oldContext.filter_device_class,
          this.context?.filter_device_class
        ) ||
          !deepEqual(
            oldContext.filter_state_class,
            this.context?.filter_state_class
          )) &&
        !units.includes(this.value)
      ) {
        fireEvent(this, "value-changed", { value: undefined });
      }
      return;
    }

    if (this.required && units.length === 1 && units[0] !== null) {
      // Preselect the only allowed unit
      fireEvent(this, "value-changed", { value: units[0] });
    }
  }

  static styles = css`
    ha-unit-of-measurement-picker {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-unit_of_measurement": HaUnitOfMeasurementSelector;
  }
}
