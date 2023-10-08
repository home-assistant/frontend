import {
  HassEntity,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDomain } from "../../../../src/common/entity/compute_domain";
import { computeStateDisplay } from "../../../../src/common/entity/compute_state_display";
import "../../../../src/components/data-table/ha-data-table";
import type { DataTableColumnContainer } from "../../../../src/components/data-table/ha-data-table";
import "../../../../src/components/entity/state-badge";
import "../../../../src/components/ha-chip";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import { HomeAssistant } from "../../../../src/types";

const SENSOR_DEVICE_CLASSES = [
  "apparent_power",
  "aqi",
  // "battery"
  "carbon_dioxide",
  "carbon_monoxide",
  "current",
  "date",
  "distance",
  "duration",
  "energy",
  "frequency",
  "gas",
  "humidity",
  "illuminance",
  "moisture",
  "monetary",
  "nitrogen_dioxide",
  "nitrogen_monoxide",
  "nitrous_oxide",
  "ozone",
  "ph",
  "pm1",
  "pm10",
  "pm25",
  "power_factor",
  "power",
  "precipitation",
  "precipitation_intensity",
  "pressure",
  "reactive_power",
  "signal_strength",
  "speed",
  "sulphur_dioxide",
  "temperature",
  "timestamp",
  "volatile_organic_compounds",
  "volatile_organic_compounds_parts",
  "voltage",
  "volume",
  "water",
  "weight",
  "wind_speed",
];

const BINARY_SENSOR_DEVICE_CLASSES = [
  "battery",
  "battery_charging",
  "carbon_monoxide",
  "cold",
  "connectivity",
  "door",
  "garage_door",
  "gas",
  "heat",
  "light",
  "lock",
  "moisture",
  "motion",
  "moving",
  "occupancy",
  "opening",
  "plug",
  "power",
  "presence",
  "problem",
  "running",
  "safety",
  "smoke",
  "sound",
  "tamper",
  "update",
  "vibration",
  "window",
];

const ENTITIES: HassEntity[] = [
  // Alarm control panel
  createEntity("alarm_control_panel.disarmed", "disarmed"),
  createEntity("alarm_control_panel.armed_home", "armed_home"),
  createEntity("alarm_control_panel.armed_away", "armed_away"),
  createEntity("alarm_control_panel.armed_night", "armed_night"),
  createEntity("alarm_control_panel.armed_vacation", "armed_vacation"),
  createEntity(
    "alarm_control_panel.armed_custom_bypass",
    "armed_custom_bypass"
  ),
  createEntity("alarm_control_panel.pending", "pending"),
  createEntity("alarm_control_panel.arming", "arming"),
  createEntity("alarm_control_panel.disarming", "disarming"),
  createEntity("alarm_control_panel.triggered", "triggered"),
  // Alert
  createEntity("alert.idle", "idle"),
  createEntity("alert.off", "off"),
  createEntity("alert.on", "on"),
  // Automation
  createEntity("automation.off", "off"),
  createEntity("automation.on", "on"),
  // Binary Sensor
  ...BINARY_SENSOR_DEVICE_CLASSES.map((dc) => [
    createEntity(`binary_sensor.${dc}`, "off", dc),
    createEntity(`binary_sensor.${dc}`, "on", dc),
  ]).reduce((arr, item) => [...arr, ...item], []),
  // Button
  createEntity("button.restart", "unknown", "restart"),
  createEntity("button.update", "unknown", "update"),
  // Calendar
  createEntity("calendar.off", "off"),
  createEntity("calendar.on", "on"),
  // Camera
  createEntity("camera.idle", "idle"),
  createEntity("camera.streaming", "streaming"),
  // Climate
  createEntity("climate.off", "off"),
  createEntity("climate.heat", "heat"),
  createEntity("climate.cool", "cool"),
  createEntity("climate.heat_cool", "heat_cool"),
  createEntity("climate.auto", "auto"),
  createEntity("climate.dry", "dry"),
  createEntity("climate.fan_only", "fan_only"),
  createEntity("climate.auto_idle", "auto", undefined, { hvac_action: "idle" }),
  createEntity("climate.auto_off", "auto", undefined, { hvac_action: "off" }),
  createEntity("climate.auto_preheating", "auto", undefined, {
    hvac_action: "preheating",
  }),
  createEntity("climate.auto_heating", "auto", undefined, {
    hvac_action: "heating",
  }),
  createEntity("climate.auto_cooling", "auto", undefined, {
    hvac_action: "cooling",
  }),
  createEntity("climate.auto_dry", "auto", undefined, {
    hvac_action: "drying",
  }),
  createEntity("climate.auto_fan", "auto", undefined, {
    hvac_action: "fan",
  }),
  // Cover
  createEntity("cover.closing", "closing"),
  createEntity("cover.closed", "closed"),
  createEntity("cover.opening", "opening"),
  createEntity("cover.open", "open"),
  createEntity("cover.awning", "open", "awning"),
  createEntity("cover.blind", "open", "blind"),
  createEntity("cover.curtain", "open", "curtain"),
  createEntity("cover.damper", "open", "damper"),
  createEntity("cover.door", "open", "door"),
  createEntity("cover.garage", "open", "garage"),
  createEntity("cover.gate", "open", "gate"),
  createEntity("cover.shade", "open", "shade"),
  createEntity("cover.shutter", "open", "shutter"),
  createEntity("cover.window", "open", "window"),
  // Device tracker/person
  createEntity("device_tracker.not_home", "not_home"),
  createEntity("device_tracker.home", "home"),
  createEntity("device_tracker.work", "work"),
  createEntity("person.home", "home"),
  createEntity("person.not_home", "not_home"),
  createEntity("person.work", "work"),
  // Fan
  createEntity("fan.off", "off"),
  createEntity("fan.on", "on"),
  // Camera
  createEntity("group.off", "off"),
  createEntity("group.on", "on"),
  // Humidifier
  createEntity("humidifier.off", "off"),
  createEntity("humidifier.on", "on"),
  // Helpers
  createEntity("input_boolean.off", "off"),
  createEntity("input_boolean.on", "on"),
  // Light
  createEntity("light.off", "off"),
  createEntity("light.on", "on"),
  // Locks
  createEntity("lock.locked", "locked"),
  createEntity("lock.unlocked", "unlocked"),
  createEntity("lock.locking", "locking"),
  createEntity("lock.unlocking", "unlocking"),
  createEntity("lock.jammed", "jammed"),
  // Media Player
  createEntity("media_player.off", "off"),
  createEntity("media_player.on", "on"),
  createEntity("media_player.idle", "idle"),
  createEntity("media_player.playing", "playing"),
  createEntity("media_player.paused", "paused"),
  createEntity("media_player.standby", "standby"),
  createEntity("media_player.buffering", "buffering"),
  createEntity("media_player.tv_off", "off", "tv"),
  createEntity("media_player.tv_playing", "playing", "tv"),
  createEntity("media_player.tv_paused", "paused", "tv"),
  createEntity("media_player.tv_standby", "standby", "tv"),
  createEntity("media_player.receiver_off", "off", "receiver"),
  createEntity("media_player.receiver_playing", "playing", "receiver"),
  createEntity("media_player.receiver_paused", "paused", "receiver"),
  createEntity("media_player.receiver_standby", "standby", "receiver"),
  createEntity("media_player.speaker_off", "off", "speaker"),
  createEntity("media_player.speaker_playing", "playing", "speaker"),
  createEntity("media_player.speaker_paused", "paused", "speaker"),
  createEntity("media_player.speaker_standby", "standby", "speaker"),
  // Plant
  createEntity("plant.ok", "ok"),
  createEntity("plant.problem", "problem"),
  // Remote
  createEntity("remote.off", "off"),
  createEntity("remote.on", "on"),
  // Schedule
  createEntity("schedule.off", "off"),
  createEntity("schedule.on", "on"),
  // Script
  createEntity("script.off", "off"),
  createEntity("script.on", "on"),
  // Sensor
  ...SENSOR_DEVICE_CLASSES.map((dc) => createEntity(`sensor.${dc}`, "10", dc)),
  // Battery sensor
  ...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, "unknown", "not_valid"].map(
    (value) =>
      createEntity(`sensor.battery_${value}`, value.toString(), "battery")
  ),
  // Siren
  createEntity("siren.off", "off"),
  createEntity("siren.on", "on"),
  // Sun
  createEntity("sun.below", "below_horizon"),
  createEntity("sun.above", "above_horizon"),
  createEntity("sun.unknown", "unknown"),
  createEntity("sun.unavailable", "unavailable"),
  // Switch
  createEntity("switch.off", "off"),
  createEntity("switch.on", "on"),
  createEntity("switch.outlet_off", "off", "outlet"),
  createEntity("switch.outlet_on", "on", "outlet"),
  createEntity("switch.switch_off", "off", "switch"),
  createEntity("switch.switch_on", "on", "switch"),
  // Timer
  createEntity("timer.idle", "idle"),
  createEntity("timer.active", "active"),
  createEntity("timer.paused", "paused"),
  // Vacuum
  createEntity("vacuum.docked", "docked"),
  createEntity("vacuum.cleaning", "cleaning"),
  createEntity("vacuum.paused", "paused"),
  createEntity("vacuum.idle", "idle"),
  createEntity("vacuum.returning", "returning"),
  createEntity("vacuum.error", "error"),
  createEntity("vacuum.cleaning", "cleaning"),
  createEntity("vacuum.off", "off"),
  createEntity("vacuum.on", "on"),
  // Update
  createEntity("update.off", "off", undefined, {
    installed_version: "1.0.0",
    latest_version: "2.0.0",
  }),
  createEntity("update.on", "on", undefined, {
    installed_version: "1.0.0",
    latest_version: "2.0.0",
  }),
  createEntity("update.installing", "on", undefined, {
    installed_version: "1.0.0",
    latest_version: "2.0.0",
    in_progress: true,
  }),
  createEntity("update.off", "off", "firmware", {
    installed_version: "1.0.0",
    latest_version: "2.0.0",
  }),
  createEntity("update.on", "on", "firmware", {
    installed_version: "1.0.0",
    latest_version: "2.0.0",
  }),
  createEntity("water_heater.off", "off"),
  createEntity("water_heater.eco", "eco"),
  createEntity("water_heater.electric", "electric"),
  createEntity("water_heater.performance", "performance"),
  createEntity("water_heater.high_demand", "high_demand"),
  createEntity("water_heater.heat_pump", "heat_pump"),
  createEntity("water_heater.gas", "gas"),
];

function createEntity(
  entity_id: string,
  state: string,
  device_class?: string,
  attributes?: HassEntityAttributeBase | HassEntity["attributes"]
): HassEntity {
  return {
    entity_id,
    state,
    attributes: {
      ...attributes,
      device_class: device_class,
    },
    last_changed: new Date().toString(),
    last_updated: new Date().toString(),
    context: {
      id: "1",
      parent_id: null,
      user_id: null,
    },
  };
}

type EntityRowData = {
  stateObj: HassEntity;
  entity_id: string;
  state: string;
  device_class?: string;
  domain: string;
};

function createRowData(stateObj: HassEntity): EntityRowData {
  return {
    stateObj,
    entity_id: stateObj.entity_id,
    state: stateObj.state,
    device_class: stateObj.attributes.device_class,
    domain: computeDomain(stateObj.entity_id),
  };
}

@customElement("demo-misc-entity-state")
export class DemoEntityState extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  private _columns = memoizeOne(
    (hass: HomeAssistant): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<EntityRowData> = {
        icon: {
          title: "Icon",
          template: (entry) => html`
            <state-badge
              .stateObj=${entry.stateObj}
              .stateColor=${true}
            ></state-badge>
          `,
        },
        entity_id: {
          title: "Entity ID",
          width: "30%",
          filterable: true,
          sortable: true,
        },
        state: {
          title: "State",
          width: "20%",
          sortable: true,
          template: (entry) =>
            html`${computeStateDisplay(
              hass.localize,
              entry.stateObj,
              hass.locale,
              hass.config,
              hass.entities
            )}`,
        },
        device_class: {
          title: "Device class",
          template: (entry) => html`${entry.device_class ?? "-"}`,
          width: "20%",
          filterable: true,
          sortable: true,
        },
        domain: {
          title: "Domain",
          template: (entry) => html`${computeDomain(entry.entity_id)}`,
          width: "20%",
          filterable: true,
          sortable: true,
        },
      };

      return columns;
    }
  );

  private _rows = memoizeOne((): EntityRowData[] =>
    ENTITIES.map(createRowData)
  );

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-data-table
        .hass=${this.hass}
        .columns=${this._columns(this.hass)}
        .data=${this._rows()}
        auto-height
      ></ha-data-table>
    `;
  }

  static get styles() {
    return css`
      .color {
        display: block;
        height: 20px;
        width: 20px;
        border-radius: 10px;
        background-color: rgb(--color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-misc-entity-state": DemoEntityState;
  }
}
