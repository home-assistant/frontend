import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";
import type {
  ExtEntityRegistryEntry,
  FanFavorite,
} from "../../../../src/data/entity/entity_registry";
import type { FanEntity } from "../../../../src/data/fan";
import { FanEntityFeature } from "../../../../src/data/fan";

const ENTITIES = [
  {
    entity_id: "fan.fan",
    state: "on",
    attributes: {
      friendly_name: "Fan",
      device_class: "fan",
      supported_features:
        FanEntityFeature.OSCILLATE +
        FanEntityFeature.DIRECTION +
        FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.one_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "One speed fan",
      device_class: "fan",
      percentage: 100,
      percentage_step: 100,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.two_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Two speed fan",
      device_class: "fan",
      percentage: 50,
      percentage_step: 50,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.three_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Three speed fan",
      device_class: "fan",
      percentage: 67,
      percentage_step: 100 / 3,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.four_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Four speed fan",
      device_class: "fan",
      percentage: 50,
      percentage_step: 25,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.five_speed_fan",
    state: "on",
    attributes: {
      friendly_name: "Five speed fan",
      device_class: "fan",
      percentage: 80,
      percentage_step: 20,
      supported_features: FanEntityFeature.SET_SPEED,
    },
  },
  {
    entity_id: "fan.ceiling_fan",
    state: "on",
    attributes: {
      friendly_name: "Ceiling fan with favorites",
      percentage: 50,
      percentage_step: 25,
      direction: "forward",
      supported_features:
        FanEntityFeature.SET_SPEED + FanEntityFeature.DIRECTION,
    },
  },
  {
    entity_id: "fan.living_room_fan",
    state: "on",
    attributes: {
      friendly_name: "Living room fan with favorites",
      percentage: 30,
      direction: "forward",
      oscillating: true,
      preset_mode: "normal",
      preset_modes: ["normal", "nature", "sleep"],
      supported_features:
        FanEntityFeature.SET_SPEED +
        FanEntityFeature.DIRECTION +
        FanEntityFeature.OSCILLATE +
        FanEntityFeature.PRESET_MODE +
        FanEntityFeature.TURN_ON +
        FanEntityFeature.TURN_OFF,
    },
  },
  {
    entity_id: "fan.bedroom_fan",
    state: "off",
    attributes: {
      friendly_name: "Bedroom fan without favorites",
      percentage_step: 100 / 3,
      oscillating: false,
      supported_features:
        FanEntityFeature.SET_SPEED + FanEntityFeature.OSCILLATE,
    },
  },
];

const FAVORITES: Record<string, FanFavorite[]> = {
  "fan.ceiling_fan": [
    { percentage: 25, direction: "forward" },
    { percentage: 75, direction: "forward" },
    { percentage: 100, direction: "reverse" },
  ],
  "fan.living_room_fan": [
    { percentage: 30, direction: "forward", oscillating: true },
    { percentage: 60, direction: "reverse", oscillating: false },
    { percentage: 100, direction: "forward", oscillating: true },
    // Saved before the fan supported oscillation: applying it leaves the
    // oscillation unchanged.
    { percentage: 45, direction: "reverse" },
  ],
  "fan.bedroom_fan": [],
};

const createEntry = (
  entityId: string,
  favorites: FanFavorite[]
): ExtEntityRegistryEntry =>
  ({
    entity_id: entityId,
    platform: "demo",
    options: favorites.length ? { fan: { favorites } } : {},
  }) as unknown as ExtEntityRegistryEntry;

const ENTRIES = Object.fromEntries(
  Object.entries(FAVORITES).map(([entityId, favorites]) => [
    entityId,
    createEntry(entityId, favorites),
  ])
);

@customElement("demo-more-info-fan")
class DemoMoreInfoFan extends LitElement {
  @property({ attribute: false }) public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES.map((ent) => ent.entity_id)}
        .entries=${ENTRIES}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);

    hass.mockWS(
      "config/entity_registry/update",
      ({ entity_id, options_domain, options }) => ({
        entity_entry: {
          ...ENTRIES[entity_id],
          options: { [options_domain]: options },
        },
      })
    );

    // Mirrors fan reproduce_state in the core. The calls are worked out from
    // the state before applying and then run in order. Speed and preset are
    // skipped when missing, but direction and oscillation are compared even
    // then, and a missing value fails the call like the core schema does.
    const reproduceFanState = async (
      currentHass: MockHomeAssistant,
      entityId: string,
      target: { state: string } & FanEntity["attributes"]
    ) => {
      const current = currentHass.states[entityId] as FanEntity;
      const calls: [string, Record<string, unknown>][] = [];

      if (target.state === "off") {
        if (current.state !== "off") {
          calls.push(["turn_off", {}]);
        }
      } else {
        if (current.state !== "on") {
          calls.push([
            "turn_on",
            Object.fromEntries(
              (["percentage", "preset_mode"] as const)
                .filter((attribute) => target[attribute] != null)
                .map((attribute) => [attribute, target[attribute]])
            ),
          ]);
        } else {
          if (
            target.percentage != null &&
            target.percentage !== current.attributes.percentage
          ) {
            calls.push(["set_percentage", { percentage: target.percentage }]);
          }
          if (
            target.preset_mode != null &&
            target.preset_mode !== current.attributes.preset_mode
          ) {
            calls.push([
              "set_preset_mode",
              { preset_mode: target.preset_mode },
            ]);
          }
        }
        const direction = target.direction ?? null;
        if (direction !== (current.attributes.direction ?? null)) {
          calls.push(["set_direction", { direction }]);
        }
        const oscillating = target.oscillating ?? null;
        if (oscillating !== (current.attributes.oscillating ?? null)) {
          calls.push(["oscillate", { oscillating }]);
        }
      }

      for (const [service, data] of calls) {
        if (Object.values(data).includes(null)) {
          throw new Error(`fan.${service} does not accept an empty value`);
        }
        // The core waits for each call before the next one.
        // eslint-disable-next-line no-await-in-loop
        await hass.callService("fan", service, {
          entity_id: entityId,
          ...data,
        });
      }
    };

    hass.mockService("scene", "apply", async (data, _target, currentHass) => {
      await Promise.all(
        Object.entries(data?.entities ?? {}).map(([entityId, target]) =>
          reproduceFanState(
            currentHass,
            entityId,
            target as { state: string } & FanEntity["attributes"]
          )
        )
      );
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-fan": DemoMoreInfoFan;
  }
}
