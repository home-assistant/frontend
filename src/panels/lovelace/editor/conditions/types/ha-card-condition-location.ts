import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  array,
  assert,
  boolean,
  literal,
  object,
  optional,
  string,
} from "superstruct";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { slugify } from "../../../../../common/string/slugify";
import { deepEqual } from "../../../../../common/util/deep-equal";
import "../../../../../components/ha-alert";
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

/**
 * Pick an unused zone ID for a name that matches no zone, adding `_2`, `_3`
 * and so on like Home Assistant does for new entities. A renamed zone keeps
 * its old ID, so the plain slug could select a zone the name never matched.
 * `reserved` holds IDs already picked for other names that slugify the same.
 */
function missingZoneId(
  name: string,
  states: HassEntities,
  reserved: Set<string>
): string {
  const baseId = `zone.${slugify(name)}`;
  let entityId = baseId;
  let i = 2;
  while (entityId in states || reserved.has(entityId)) {
    entityId = `${baseId}_${i}`;
    i++;
  }
  return entityId;
}

/**
 * Convert `locations` (zone names matched against the person state) to a
 * zone target matched against the person `in_zones` attribute.
 */
function migrateLocationCondition(
  condition: LocationCondition,
  states: HassEntities
): LocationCondition {
  // The person state is "home" for zone.home, otherwise the zone name.
  // Zone names aren't unique, and the old condition matched every zone with
  // the name, so keep all of them.
  const zoneIdsByName = new Map<string, string[]>();
  for (const stateObj of Object.values(states)) {
    const name = stateObj.attributes.friendly_name;
    if (
      stateObj.entity_id.startsWith("zone.") &&
      stateObj.entity_id !== "zone.home" &&
      name
    ) {
      zoneIdsByName.set(name, [
        ...(zoneIdsByName.get(name) ?? []),
        stateObj.entity_id,
      ]);
    }
  }

  // Merge into any `target` and `away` already set in YAML.
  const target = { ...condition.target };
  const entityIds = new Set(ensureArray(target.entity_id ?? []));
  let away = condition.away === true;
  const missingIds = new Set<string>();
  for (const name of new Set(condition.locations ?? [])) {
    if (name === "not_home") {
      away = true;
    } else if (name === "home") {
      entityIds.add("zone.home");
    } else if (zoneIdsByName.has(name)) {
      for (const entityId of zoneIdsByName.get(name)!) {
        entityIds.add(entityId);
      }
    } else {
      // Names that match no zone are kept, so the picker shows them as not
      // found instead of silently removing them.
      const entityId = missingZoneId(name, states, missingIds);
      missingIds.add(entityId);
      entityIds.add(entityId);
    }
  }
  if (entityIds.size) {
    target.entity_id = [...entityIds];
  }

  const migrated: LocationCondition = { condition: "location", target };
  if (away) {
    migrated.away = true;
  }
  return migrated;
}

@customElement("ha-card-condition-location")
export class HaCardConditionLocation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: LocationCondition;

  @property({ type: Boolean }) public disabled = false;

  // `locations` is shown migrated, and written only once the condition is
  // edited, so dashboards nobody edits keep their config.
  @state() private _data?: LocationCondition;

  // Stays set after the first edit, so the alert keeps explaining the change.
  @state() private _migrated = false;

  public static get defaultConfig(): LocationCondition {
    return { condition: "location", target: {} };
  }

  protected static validateUIConfig(condition: LocationCondition) {
    return assert(condition, locationConditionStruct);
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (!changedProps.has("condition") && !changedProps.has("hass")) {
      return;
    }
    if (this.condition.locations === undefined) {
      this._data = this.condition;
      return;
    }
    this._migrated = true;
    // Redo on state changes so a renamed or added zone is picked up, but keep
    // the same object when nothing changed so the form doesn't re-render.
    const data = migrateLocationCondition(this.condition, this.hass.states);
    if (!deepEqual(data, this._data)) {
      this._data = data;
    }
  }

  protected render() {
    if (!this._data) {
      return nothing;
    }
    return html`
      ${
        this._migrated
          ? html`
              <ha-alert
                alert-type="warning"
                .title=${this.hass.localize(
                  "ui.panel.lovelace.editor.condition-editor.condition.location.migrated.title"
                )}
              >
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.condition-editor.condition.location.migrated.description"
                )}
              </ha-alert>
            `
          : nothing
      }
      <ha-form
        .hass=${this.hass}
        .data=${this._data}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value as LocationCondition;

    const condition: LocationCondition = {
      ...this.condition,
      target: value.target ?? {},
    };
    delete condition.locations;
    if (value.away) {
      condition.away = true;
    } else {
      delete condition.away;
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
    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-2, 8px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-location": HaCardConditionLocation;
  }
}
