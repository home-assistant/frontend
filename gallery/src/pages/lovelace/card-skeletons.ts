import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import type { HASSDomTargetEvent } from "../../../../src/common/dom/fire_event";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-switch";
import type { HaSwitch } from "../../../../src/components/ha-switch";
import { LightColorMode } from "../../../../src/data/light";
import type { LovelaceBadgeConfig } from "../../../../src/data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../../src/data/lovelace/config/card";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../../../src/panels/lovelace/badges/hui-badge";
import type { HuiBadge } from "../../../../src/panels/lovelace/badges/hui-badge";
import "../../../../src/panels/lovelace/cards/hui-card";
import type { HuiCard } from "../../../../src/panels/lovelace/cards/hui-card";
import { computeCardGridSize } from "../../../../src/panels/lovelace/common/compute-card-grid-size";
import type { HomeAssistant } from "../../../../src/types";
import "../../ha-demo-options";

const ENTITIES = [
  {
    entity_id: "light.bed_light",
    state: "on",
    attributes: {
      friendly_name: "Bed light",
      supported_color_modes: [LightColorMode.BRIGHTNESS],
      color_mode: LightColorMode.BRIGHTNESS,
      brightness: 180,
    },
  },
  {
    entity_id: "light.kitchen_lights",
    state: "on",
    attributes: { friendly_name: "Kitchen lights" },
  },
  {
    entity_id: "switch.tv_outlet",
    state: "off",
    attributes: { friendly_name: "TV outlet", device_class: "outlet" },
  },
  {
    entity_id: "media_player.living_room",
    state: "playing",
    attributes: { friendly_name: "Living room speaker" },
  },
  {
    entity_id: "climate.thermostat",
    state: "heat",
    attributes: {
      friendly_name: "Thermostat",
      current_temperature: 21,
      temperature: 22,
      hvac_modes: ["heat", "off"],
      hvac_action: "heating",
    },
  },
  {
    entity_id: "lock.front_door",
    state: "locked",
    attributes: { friendly_name: "Front door" },
  },
  {
    entity_id: "person.paulus",
    state: "home",
    attributes: {
      friendly_name: "Paulus",
      entity_picture: "/images/paulus.jpg",
    },
  },
  {
    entity_id: "sensor.living_room_temperature",
    state: "21.4",
    attributes: {
      friendly_name: "Living room temperature",
      device_class: "temperature",
      unit_of_measurement: "°C",
      state_class: "measurement",
    },
  },
  {
    entity_id: "sensor.living_room_humidity",
    state: "54",
    attributes: {
      friendly_name: "Living room humidity",
      device_class: "humidity",
      unit_of_measurement: "%",
      state_class: "measurement",
    },
  },
  {
    entity_id: "binary_sensor.back_door",
    state: "off",
    attributes: { friendly_name: "Back door", device_class: "door" },
  },
  {
    entity_id: "camera.garden",
    state: "idle",
    attributes: { friendly_name: "Garden" },
  },
];

/* The badges row at the top of a sections view */
const BADGES: LovelaceBadgeConfig[] = [
  { type: "entity", entity: "person.paulus", show_entity_picture: true },
  { type: "entity", entity: "sensor.living_room_temperature" },
  { type: "entity", entity: "light.kitchen_lights", show_name: true },
  { type: "entity", entity: "lock.front_door", color: "green" },
  {
    type: "entity",
    entity: "binary_sensor.back_door",
    show_name: true,
    show_state: false,
  },
];

const SECTIONS: LovelaceCardConfig[][] = [
  [
    {
      type: "heading",
      heading: "Living room",
      badges: [
        { type: "entity", entity: "sensor.living_room_temperature" },
        { type: "entity", entity: "sensor.living_room_humidity" },
      ],
    },
    {
      type: "tile",
      entity: "light.bed_light",
      features: [{ type: "light-brightness" }],
    },
    { type: "tile", entity: "switch.tv_outlet" },
    { type: "tile", entity: "media_player.living_room" },
    { type: "tile", entity: "climate.thermostat", vertical: true },
    { type: "tile", entity: "lock.front_door", vertical: true },
    { type: "entity", entity: "sensor.living_room_temperature" },
    { type: "entity", entity: "sensor.living_room_humidity" },
  ],
  [
    { type: "heading", heading: "Cameras" },
    { type: "picture-entity", entity: "camera.garden" },
    {
      type: "picture-glance",
      title: "Kitchen",
      image: "/images/kitchen.png",
      entities: [
        "light.kitchen_lights",
        "switch.tv_outlet",
        "binary_sensor.back_door",
      ],
    },
    {
      type: "picture-entity",
      image: "/images/bed.png",
      entity: "light.bed_light",
    },
  ],
  [
    { type: "heading", heading: "Overview" },
    { type: "tile", entity: "person.paulus" },
    { type: "tile", entity: "binary_sensor.back_door" },
    {
      type: "entities",
      title: "Climate",
      entities: [
        "climate.thermostat",
        "sensor.living_room_temperature",
        "sensor.living_room_humidity",
      ],
    },
    {
      type: "glance",
      title: "Doors and lights",
      entities: [
        "lock.front_door",
        "binary_sensor.back_door",
        "light.kitchen_lights",
      ],
    },
    { type: "gauge", entity: "sensor.living_room_humidity" },
  ],
];

interface DemoSlot {
  key: string;
  card: HuiCard;
}

interface BadgeSlot {
  key: string;
  badge: HuiBadge;
}

@customElement("demo-lovelace-card-skeletons")
class DemoCardSkeletons extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _loaded = new Set<string>();

  @state() private _simulating = false;

  private _sections: DemoSlot[][] = [];

  private _badges: BadgeSlot[] = [];

  private _timers: number[] = [];

  /* Whether each card or badge was last told it's loading */
  private _loadingShown = new WeakMap<Element, boolean>();

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(ENTITIES);
    mockIcons(hass);
    // Camera snapshots come from a signed path; point it at a gallery image.
    hass.mockWS("auth/sign_path", () => ({
      path: "/images/office.jpg?authSig=gallery",
    }));
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimers();
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has("hass") || !this.hass) {
      return;
    }

    if (this._sections.length === 0) {
      this._sections = SECTIONS.map((cards, sectionIndex) =>
        cards.map((config, cardIndex) => {
          const card = document.createElement("hui-card");
          card.layout = "grid";
          card.config = config;

          return { key: `${sectionIndex}-${cardIndex}`, card };
        })
      );
      this._badges = BADGES.map((config, index) => {
        const badge = document.createElement("hui-badge");
        badge.config = config;

        return { key: `badge-${index}`, badge };
      });
    }

    this._elements().forEach(({ element }) => {
      element.hass = this.hass;
    });
  }

  /* Every card and badge, as one list to measure and reveal */
  private _elements() {
    return [
      ...this._badges.map(({ key, badge }) => ({ key, element: badge })),
      ...this._sections.flat().map(({ key, card }) => ({ key, element: card })),
    ];
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-demo-options>
        <ha-switch
          .checked=${this._loaded.size === 0}
          .disabled=${this._simulating}
          @change=${this._loadingToggled}
        ></ha-switch>
        <span>Loading</span>
        <ha-button
          size="s"
          appearance="filled"
          .disabled=${this._simulating}
          @click=${this._simulate}
        >
          Simulate loading
        </ha-button>
      </ha-demo-options>
      <div class="badges">${this._badges.map(({ badge }) => badge)}</div>
      <div class="view">
        ${this._sections.map(
          (slots) => html`
            <div class="section">
              ${slots.map((slot) => this._renderSlot(slot))}
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderSlot({ card }: DemoSlot): TemplateResult {
    const { rows, columns } = computeCardGridSize(card.getGridOptions());
    const fitRows = rows !== "auto";
    const fullWidth = columns === "full";

    return html`
      <div
        class="card ${classMap({
          "fit-rows": fitRows,
          "full-width": fullWidth,
        })}"
        style=${styleMap({
          "--column-size": fullWidth ? undefined : columns,
          "--row-size": fitRows ? rows : undefined,
        })}
      >
        ${card}
      </div>
    `;
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    // A card or badge makes its content when it first updates
    this._elements().forEach(async ({ key, element }) => {
      await element.updateComplete;
      this._setLoading(element, !this._loaded.has(key));
    });
  }

  /* Each card and badge already sits in its own skeleton overlay. Say it's
     loading from inside, as a card waiting on its data does. */
  private _setLoading(wrapper: HuiCard | HuiBadge, loading: boolean) {
    const content = wrapper.querySelector(":scope > ha-skeleton-overlay > *");

    if (
      !(content instanceof HTMLElement) ||
      this._loadingShown.get(content) === loading
    ) {
      return;
    }

    this._loadingShown.set(content, loading);
    fireEvent(content, "skeleton-loading", { loading });
  }

  private _keys(): string[] {
    return this._elements().map(({ key }) => key);
  }

  private _loadingToggled(ev: HASSDomTargetEvent<HaSwitch>) {
    this._clearTimers();
    this._loaded = ev.target.checked ? new Set() : new Set(this._keys());
  }

  private _simulate() {
    this._clearTimers();
    this._loaded = new Set();
    this._simulating = true;
    const keys = this._keys();
    keys.forEach((key) => {
      const delay = 600 + Math.random() * 2400;
      this._timers.push(
        window.setTimeout(() => {
          this._loaded = new Set(this._loaded).add(key);

          if (this._loaded.size === keys.length) {
            this._simulating = false;
          }
        }, delay)
      );
    });
  }

  private _clearTimers() {
    this._timers.forEach((timer) => clearTimeout(timer));
    this._timers = [];
    this._simulating = false;
  }

  static styles = css`
    ha-demo-options {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    ha-demo-options ha-button {
      margin-inline-start: var(--ha-space-4);
    }
    .view {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--ha-space-8);
      padding: var(--ha-space-4);
      background-color: var(--primary-background-color);
      align-items: start;
    }
    .section {
      --row-gap: 8px;
      --column-gap: 8px;
      --row-height: 56px;
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      grid-auto-rows: auto;
      row-gap: var(--row-gap);
      column-gap: var(--column-gap);
    }
    .card {
      grid-row: span var(--row-size, 1);
      grid-column: span min(var(--column-size, 12), 12);
    }
    .card.fit-rows {
      height: calc(
        (var(--row-size, 1) * (var(--row-height) + var(--row-gap))) - var(
            --row-gap
          )
      );
    }
    .card.full-width {
      grid-column: 1 / -1;
    }
    /* As hui-view-badges lays out the badges row */
    .badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--ha-space-2);
      padding: var(--ha-space-4) var(--ha-space-4) 0;
      background-color: var(--primary-background-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-card-skeletons": DemoCardSkeletons;
  }
}
