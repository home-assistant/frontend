import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";
import { VacuumEntityFeature } from "../../../../src/data/vacuum";

const ALL_FEATURES =
  VacuumEntityFeature.STATE +
  VacuumEntityFeature.START +
  VacuumEntityFeature.PAUSE +
  VacuumEntityFeature.STOP +
  VacuumEntityFeature.RETURN_HOME +
  VacuumEntityFeature.FAN_SPEED +
  VacuumEntityFeature.BATTERY +
  VacuumEntityFeature.STATUS +
  VacuumEntityFeature.LOCATE +
  VacuumEntityFeature.CLEAN_SPOT +
  VacuumEntityFeature.CLEAN_AREA;

const ENTITIES = [
  {
    entity_id: "vacuum.full_featured",
    state: "docked",
    attributes: {
      friendly_name: "Full featured vacuum",
      supported_features: ALL_FEATURES,
      battery_level: 85,
      battery_icon: "mdi:battery-80",
      fan_speed: "balanced",
      fan_speed_list: ["silent", "standard", "balanced", "turbo", "max"],
      status: "Charged",
    },
  },
  {
    entity_id: "vacuum.cleaning_vacuum",
    state: "cleaning",
    attributes: {
      friendly_name: "Cleaning vacuum",
      supported_features: ALL_FEATURES,
      battery_level: 62,
      battery_icon: "mdi:battery-60",
      fan_speed: "turbo",
      fan_speed_list: ["silent", "standard", "balanced", "turbo", "max"],
      status: "Cleaning bedroom",
    },
  },
  {
    entity_id: "vacuum.returning_vacuum",
    state: "returning",
    attributes: {
      friendly_name: "Returning vacuum",
      supported_features:
        VacuumEntityFeature.STATE +
        VacuumEntityFeature.START +
        VacuumEntityFeature.PAUSE +
        VacuumEntityFeature.STOP +
        VacuumEntityFeature.RETURN_HOME +
        VacuumEntityFeature.BATTERY,
      battery_level: 23,
      battery_icon: "mdi:battery-20",
      status: "Returning to dock",
    },
  },
  {
    entity_id: "vacuum.error_vacuum",
    state: "error",
    attributes: {
      friendly_name: "Error vacuum",
      supported_features:
        VacuumEntityFeature.STATE +
        VacuumEntityFeature.START +
        VacuumEntityFeature.STOP +
        VacuumEntityFeature.RETURN_HOME +
        VacuumEntityFeature.LOCATE,
      status: "Stuck on obstacle",
    },
  },
  {
    entity_id: "vacuum.basic_vacuum",
    state: "docked",
    attributes: {
      friendly_name: "Basic vacuum",
      supported_features:
        VacuumEntityFeature.START +
        VacuumEntityFeature.STOP +
        VacuumEntityFeature.RETURN_HOME,
    },
  },
  {
    entity_id: "vacuum.paused_vacuum",
    state: "paused",
    attributes: {
      friendly_name: "Paused vacuum",
      supported_features: ALL_FEATURES,
      battery_level: 45,
      battery_icon: "mdi:battery-40",
      fan_speed: "standard",
      fan_speed_list: ["silent", "standard", "balanced", "turbo", "max"],
      status: "Paused",
    },
  },
];

@customElement("demo-more-info-vacuum")
class DemoMoreInfoVacuum extends LitElement {
  @property({ attribute: false }) public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES.map((ent) => ent.entity_id)}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-vacuum": DemoMoreInfoVacuum;
  }
}
