import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  boolean,
  literal,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import { targetStruct } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import type { LocationCondition } from "../../../common/validate-condition";

const locationConditionStruct = object({
  condition: literal("location"),
  locations: optional(array(string())),
  target: optional(targetStruct),
  away: optional(boolean()),
});

const LEGACY_SCHEMA: HaFormSchema[] = [
  {
    name: "locations",
    selector: {
      state: {
        entity_id: "person.whomever",
        hide_states: ["unavailable", "unknown"],
        multiple: true,
      },
    },
  },
];

const SCHEMA: HaFormSchema[] = [
  {
    name: "target",
    selector: { target: { entity: { domain: "zone" } } },
  },
  {
    name: "away",
    selector: { boolean: {} },
  },
];

@customElement("ha-card-condition-location")
export class HaCardConditionLocation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: LocationCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): LocationCondition {
    return { condition: "location", target: {} };
  }

  protected static validateUIConfig(condition: LocationCondition) {
    return assert(condition, locationConditionStruct);
  }

  private get _isLegacy(): boolean {
    return this.condition.locations !== undefined;
  }

  private _schema = memoizeOne((legacy: boolean) =>
    legacy ? LEGACY_SCHEMA : SCHEMA
  );

  protected render() {
    const legacy = this._isLegacy;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .schema=${this._schema(legacy)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
      ></ha-form>
      ${
        legacy
          ? html`
              <ha-button
                appearance="plain"
                size="small"
                .disabled=${this.disabled}
                @click=${this._convert}
              >
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.condition-editor.condition.location.convert"
                )}
              </ha-button>
            `
          : nothing
      }
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value as LocationCondition;

    const condition: LocationCondition = { condition: "location" };
    if (this._isLegacy) {
      condition.locations = value.locations ?? [];
    } else {
      condition.target = value.target ?? {};
      if (value.away) {
        condition.away = true;
      }
    }

    fireEvent(this, "value-changed", { value: condition });
  }

  /**
   * Convert `locations` (zone names matched against the person state) to a
   * zone target matched against the person `in_zones` attribute.
   */
  private _convert(): void {
    const names = new Set(this.condition.locations ?? []);

    // The person state is "home" for zone.home, otherwise the zone name.
    const zoneIds = Object.values(this.hass.states)
      .filter((stateObj) => stateObj.entity_id.startsWith("zone."))
      .filter((stateObj) =>
        stateObj.entity_id === "zone.home"
          ? names.has("home")
          : names.has(stateObj.attributes.friendly_name ?? "")
      )
      .map((stateObj) => stateObj.entity_id);

    const condition: LocationCondition = {
      condition: "location",
      target: zoneIds.length ? { entity_id: zoneIds } : {},
    };
    if (names.has("not_home")) {
      condition.away = true;
    }

    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (schema: HaFormSchema): string =>
    this.hass.localize(
      `ui.panel.lovelace.editor.condition-editor.condition.location.${schema.name}`
    );

  private _computeHelperCallback = (schema: HaFormSchema): string =>
    this.hass.localize(
      `ui.panel.lovelace.editor.condition-editor.condition.location.${schema.name}_helper`
    );

  static styles = css`
    :host {
      display: block;
    }
    ha-button {
      margin-top: var(--ha-space-2, 8px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-location": HaCardConditionLocation;
  }
}
