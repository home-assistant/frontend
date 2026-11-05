import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  boolean,
  enums,
  literal,
  object,
  optional,
  string,
} from "superstruct";
import type { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import { formatListWithAnds } from "../../../../../common/string/format-list";
import { slugify } from "../../../../../common/string/slugify";
import { deepEqual } from "../../../../../common/util/deep-equal";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { targetStruct } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import {
  LOCATION_MATCH_MODES,
  resolveLocationZones,
  type LocationCondition,
} from "../../../common/validate-condition";

const locationConditionStruct = object({
  condition: literal("location"),
  locations: optional(array(string())),
  target: optional(targetStruct),
  match_mode: optional(enums(LOCATION_MATCH_MODES)),
  away: optional(boolean()),
});

const LOCALIZE_PREFIX =
  "ui.panel.lovelace.editor.condition-editor.condition.location";

/**
 * Pick an unused zone ID for a name that matches no zone, adding `_2`, `_3`
 * and so on like Home Assistant does for new entities. A renamed zone keeps
 * its old ID, so the plain slug could select a zone the name never matched.
 * Registered zones count as taken even without a state, such as while they
 * reload. `reserved` holds IDs already picked for other names that slugify
 * the same.
 */
function missingZoneId(
  name: string,
  hass: HomeAssistant,
  reserved: Set<string>
): string {
  const baseId = `zone.${slugify(name)}`;
  let entityId = baseId;
  let i = 2;
  while (
    entityId in hass.states ||
    entityId in hass.entities ||
    reserved.has(entityId)
  ) {
    entityId = `${baseId}_${i}`;
    i++;
  }
  return entityId;
}

/**
 * Convert `locations` (zone names) to a zone target. `active_zone` matches
 * the person state like `locations` did, so the condition behaves the same.
 */
export function migrateLocationCondition(
  condition: LocationCondition,
  hass: HomeAssistant
): LocationCondition {
  // The person state is "home" for zone.home, otherwise the zone name.
  // Zone names aren't unique, and the old condition matched every zone with
  // the name, so keep all of them.
  const zoneIdsByName = new Map<string, string[]>();
  for (const stateObj of Object.values(hass.states)) {
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

  // Validation rejects `locations` with `target`, but `away` can be set too.
  const entityIds = new Set<string>();
  let away = condition.away === true;
  const missingIds = new Set<string>();
  for (const name of new Set(condition.locations ?? [])) {
    // A zone can also be named "home" or "not_home", and the old condition
    // matched it too, so these still collect zones by name.
    if (name === "not_home") {
      away = true;
    } else if (name === "home") {
      entityIds.add("zone.home");
    }
    const zoneIds = zoneIdsByName.get(name);
    if (zoneIds) {
      for (const entityId of zoneIds) {
        entityIds.add(entityId);
      }
    } else if (name !== "home" && name !== "not_home") {
      // Names that match no zone are kept, so the picker shows them as not
      // found instead of silently removing them.
      const entityId = missingZoneId(name, hass, missingIds);
      missingIds.add(entityId);
      entityIds.add(entityId);
    }
  }
  const migrated: LocationCondition = {
    condition: "location",
    target: entityIds.size ? { entity_id: [...entityIds] } : {},
    match_mode: "active_zone",
  };
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

  // The zone states `_data` was built from, including registered zones and
  // zones it names that have no state, so hass updates that change no zone
  // skip the migration.
  private _zoneStates?: Map<string, HassEntity | undefined>;

  public static get defaultConfig(): LocationCondition {
    return { condition: "location", target: {} };
  }

  protected static validateUIConfig(
    condition: LocationCondition,
    hass: HomeAssistant
  ) {
    assert(condition, locationConditionStruct);
    // Converting would drop the target, so leave this invalid mix to YAML.
    if (
      condition.locations !== undefined &&
      (condition.target !== undefined || condition.match_mode !== undefined)
    ) {
      throw new Error(
        hass.localize("ui.errors.config.location_locations_combined")
      );
    }
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (!changedProps.has("condition") && !changedProps.has("hass")) {
      return;
    }
    if (this.condition.locations === undefined) {
      this._data = this.condition;
      this._zoneStates = undefined;
      return;
    }
    this._migrated = true;
    // Redo only when a zone state or the entity registry changes, so a
    // renamed, added or removed zone is picked up.
    if (
      !changedProps.has("condition") &&
      changedProps.get("hass")?.entities === this.hass.entities &&
      !this._zonesChanged()
    ) {
      return;
    }
    const data = migrateLocationCondition(this.condition, this.hass);
    this._zoneStates = new Map();
    for (const entityId of [
      ...Object.keys(this.hass.states),
      ...Object.keys(this.hass.entities),
      ...ensureArray(data.target?.entity_id ?? []),
    ]) {
      if (computeDomain(entityId) !== "zone") {
        continue;
      }
      this._zoneStates.set(entityId, this.hass.states[entityId]);
    }
    // Keep the same object when nothing changed so the form doesn't re-render.
    if (!deepEqual(data, this._data)) {
      this._data = data;
    }
  }

  private _zonesChanged(): boolean {
    if (!this._zoneStates) {
      return true;
    }
    for (const [entityId, stateObj] of this._zoneStates) {
      if (this.hass.states[entityId] !== stateObj) {
        return true;
      }
    }
    return false;
  }

  private _schema = memoizeOne((localize: LocalizeFunc): HaFormSchema[] => [
    {
      name: "target",
      selector: { target: { entity: { domain: "zone" } } },
    },
    {
      name: "match_mode",
      required: true,
      selector: {
        select: {
          mode: "box",
          box_max_columns: 1,
          options: LOCATION_MATCH_MODES.map((mode) => ({
            value: mode,
            label: localize(
              `${LOCALIZE_PREFIX}.match_mode_options.${mode}.label`
            ),
            description: localize(
              `${LOCALIZE_PREFIX}.match_mode_options.${mode}.description`
            ),
          })),
        },
      },
    },
    {
      name: "away",
      selector: { boolean: {} },
    },
  ]);

  // Shows the `any_zone` default as selected.
  private _formData = memoizeOne(
    (data: LocationCondition): LocationCondition => ({
      match_mode: "any_zone",
      ...data,
    })
  );

  /** Selected passive zones, which never match `active_zone`. */
  private _passiveZones(): string[] {
    if (this._data?.match_mode !== "active_zone" || !this._data.target) {
      return [];
    }
    return resolveLocationZones(this.hass, this._data.target)
      .map((zoneId) => this.hass.states[zoneId])
      .filter((stateObj) => stateObj?.attributes.passive)
      .map((stateObj) => computeStateName(stateObj));
  }

  protected render() {
    if (!this._data) {
      return nothing;
    }
    const passiveZones = this._passiveZones();
    return html`
      ${
        this._migrated
          ? html`
              <ha-alert alert-type="info">
                ${this.hass.localize(`${LOCALIZE_PREFIX}.migrated`)}
              </ha-alert>
            `
          : nothing
      }
      <ha-form
        .hass=${this.hass}
        .data=${this._formData(this._data)}
        .schema=${this._schema(this.hass.localize)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
      ></ha-form>
      ${
        passiveZones.length
          ? html`
              <ha-alert alert-type="warning">
                ${this.hass.localize(`${LOCALIZE_PREFIX}.passive_zones`, {
                  count: passiveZones.length,
                  zones: formatListWithAnds(this.hass.locale, passiveZones),
                })}
              </ha-alert>
            `
          : nothing
      }
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
    // `any_zone` is the default, so it's left out.
    if (value.match_mode === "active_zone") {
      condition.match_mode = "active_zone";
    } else {
      delete condition.match_mode;
    }
    if (value.away) {
      condition.away = true;
    } else {
      delete condition.away;
    }

    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (schema: HaFormSchema): string =>
    this.hass.localize(`${LOCALIZE_PREFIX}.${schema.name}`);

  private _computeHelperCallback = (schema: HaFormSchema): string =>
    this.hass.localize(`${LOCALIZE_PREFIX}.${schema.name}_helper`);

  static styles = css`
    :host {
      display: block;
    }
    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-2, 8px);
    }
    ha-form + ha-alert {
      margin-top: var(--ha-space-2, 8px);
      margin-bottom: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-location": HaCardConditionLocation;
  }
}
