import { ContextProvider, provide } from "@lit/context";
import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import { listenMediaQuery } from "../../../src/common/dom/media_query";
import type { AreaRegistryEntry } from "../../../src/data/area/area_registry";
import type { CalendarEventApiData } from "../../../src/data/calendar";
import { reducedMotionContext } from "../../../src/data/context";
import type { EnergyInfo, EnergyPreferences } from "../../../src/data/energy";
import { EMPTY_PREFERENCES } from "../../../src/data/energy";
import type { EntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import type { EntityInput } from "../../../src/fake_data/entities/types";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { provideHass } from "../../../src/fake_data/provide_hass";
import type { DemoArea } from "../stubs/area_registry";
import { toAreaRegistryEntry } from "../stubs/area_registry";
import { mockAuth } from "../stubs/auth";
import {
  FAMILY_EVENTS,
  mockCalendarEvents,
  WORK_EVENTS,
} from "../stubs/calendar";
import { newEntry } from "../stubs/entity_registry";
import { mockHistory } from "../stubs/history";
import { mockIcons } from "../stubs/icons";
import { mockLogbook } from "../stubs/logbook";
import { mockMediaPlayer } from "../stubs/media_player";
import { mockRecorder } from "../stubs/recorder";
import { mockSensor } from "../stubs/sensor";
import { mockTemplate } from "../stubs/template";
import { mockTodo } from "../stubs/todo";
import { mockWeather } from "../stubs/weather";
import { embedHassContext } from "./context";
import { readScriptData } from "./script-data";

/** The data of a provider, as set by its script child. */
interface EmbedProviderData {
  entities?: EntityInput[];
  areas?: DemoArea[];
  calendars?: Record<string, CalendarEventApiData[]>;
  energy?: Partial<EnergyPreferences>;
}

const SAMPLE_CALENDAR_EVENTS = [FAMILY_EVENTS, WORK_EVENTS];

// "living_room" becomes "Living room"
const areaName = (areaId: string) => {
  const name = areaId.replaceAll("_", " ");

  return name.charAt(0).toUpperCase() + name.slice(1);
};

/**
 * Holds a mocked Home Assistant backend for all `ha-embed-card` elements
 * inside it. Cards in the same provider share their entities.
 */
@customElement("ha-embed-provider")
export class HaEmbedProvider extends LitElement {
  @provide({ context: embedHassContext })
  @property({ attribute: false })
  public hass!: MockHomeAssistant;

  /**
   * All entities of the backend. Each change replaces all entities.
   * Also read from a JSON or YAML script child, see `readScriptData`. The
   * script holds either the list of entities or an object with `entities`,
   * `areas`, `calendars` and `energy`.
   */
  @property({ type: Array }) public entities: EntityInput[] = [];

  /** All areas. Without them, an area for each `area_id` of the entities. */
  @property({ attribute: false }) public areas?: DemoArea[];

  /**
   * Events of calendar entities by entity ID. Calendars without events here
   * get sample events around today.
   */
  @property({ attribute: false }) public calendars?: Record<
    string,
    CalendarEventApiData[]
  >;

  /** Energy preferences. Without them, energy is not set up. */
  @property({ attribute: false }) public energy?: Partial<EnergyPreferences>;

  /** Light or dark mode of the cards. Without it, the browser setting. */
  @property({ attribute: "color-scheme" }) public colorScheme?:
    "light" | "dark";

  private _reducedMotion = new ContextProvider(this, {
    context: reducedMotionContext,
    initialValue: false,
  });

  private _prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;

  private _unsubMediaQueries: (() => void)[] = [];

  private _scriptRead = false;

  private _applyColorScheme() {
    const dark = this.colorScheme
      ? this.colorScheme === "dark"
      : this._prefersDark;
    if (this.hass.themes.darkMode !== dark) {
      this.hass.updateHass({
        themes: { ...this.hass.themes, darkMode: dark },
        selectedTheme: { ...this.hass.selectedTheme!, dark },
      });
    }
  }

  constructor() {
    super();
    // Set up in the constructor so that the contexts exist before the
    // child cards connect and request them.
    const hass = provideHass(this);
    hass.updateTranslations(null);
    hass.updateTranslations("lovelace");
    mockIcons(hass);
    mockAuth(hass);
    mockHistory(hass);
    mockRecorder(hass);
    mockTemplate(hass);
    mockSensor(hass);
    mockMediaPlayer(hass);
    mockTodo(hass);
    mockWeather(hass);
    mockLogbook(hass);
    hass.updateHass({
      config: {
        ...hass.config,
        components: [...hass.config.components, "logbook"],
      },
    });
    mockCalendarEvents(hass, (entityId, currentHass) => {
      if (!(entityId in currentHass.states)) {
        return null;
      }

      const calendarIds = Object.keys(currentHass.states).filter((id) =>
        id.startsWith("calendar.")
      );

      return (
        this.calendars?.[entityId] ??
        SAMPLE_CALENDAR_EVENTS[
          calendarIds.indexOf(entityId) % SAMPLE_CALENDAR_EVENTS.length
        ]
      );
    });
    hass.mockWS("config/area_registry/list", (_msg, currentHass) =>
      Object.values(currentHass.areas)
    );
    // The registry of the entities, without settings such as calendar colors
    hass.mockWS(
      "config/entity_registry/list",
      (_msg, currentHass): EntityRegistryEntry[] =>
        Object.values(currentHass.entities).map((entity) => ({
          ...newEntry({
            entity_id: entity.entity_id,
            platform: entity.platform ?? "demo",
            unique_id: entity.entity_id,
          }),
          area_id: entity.area_id ?? null,
          device_id: entity.device_id ?? null,
        }))
    );
    hass.mockWS("energy/get_prefs", (): EnergyPreferences => ({
      ...EMPTY_PREFERENCES,
      ...this.energy,
    }));
    hass.mockWS("energy/info", (): EnergyInfo => ({
      cost_sensors: {},
      solar_forecast_domains: [],
    }));
    this._applyColorScheme();
  }

  public connectedCallback() {
    super.connectedCallback();
    this._unsubMediaQueries = [
      listenMediaQuery("(prefers-color-scheme: dark)", (matches) => {
        this._prefersDark = matches;
        this._applyColorScheme();
      }),
      listenMediaQuery("(prefers-reduced-motion: reduce)", (matches) =>
        this._reducedMotion.setValue(matches)
      ),
    ];

    // Only once, so that moving the provider keeps the current entities
    if (this._scriptRead) {
      return;
    }

    this._scriptRead = true;

    const data = readScriptData(this) as
      EntityInput[] | EmbedProviderData | undefined;

    if (Array.isArray(data)) {
      this.entities = data;
    } else if (data) {
      this.entities = data.entities ?? [];
      this.areas = data.areas;
      this.calendars = data.calendars;
      this.energy = data.energy;
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubMediaQueries.forEach((unsub) => unsub());
    this._unsubMediaQueries = [];
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("colorScheme")) {
      this._applyColorScheme();
    }

    if (changedProps.has("entities") || changedProps.has("areas")) {
      const areas: DemoArea[] =
        this.areas ??
        [
          ...new Set(
            this.entities
              .map((entity) => entity.area_id)
              .filter((areaId) => areaId !== undefined)
          ),
        ].map((areaId) => ({ area_id: areaId, name: areaName(areaId) }));

      const areasById: Record<string, AreaRegistryEntry> = {};
      areas.forEach((area) => {
        areasById[area.area_id] = toAreaRegistryEntry(area);
      });
      // Before the entities, so that their names can include the area
      this.hass.updateHass({ areas: areasById });

      // Entities that services changed keep their state when only the areas
      // change
      if (changedProps.has("entities")) {
        this.hass.addEntities(this.entities, true);
      } else {
        this.hass.updateFormatFunctions();
      }
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    const oldHass = changedProps.get("hass");
    // The first update holds the initial entities. They are not changes.
    if (!oldHass) {
      return;
    }
    // Other updates, such as loaded translations, keep the same states object.
    if (oldHass.states !== this.hass.states) {
      fireEvent(this, "states-changed", { states: this.hass.states });
    }
  }

  protected render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-provider": HaEmbedProvider;
  }
  interface HASSDomEvents {
    "states-changed": { states: HassEntities };
  }
}
