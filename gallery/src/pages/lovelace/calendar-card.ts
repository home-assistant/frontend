import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { CalendarCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type { DemoCardConfig } from "../../components/demo-card";
import "../../components/demo-cards";
import { CALENDAR_ENTITIES, mockCalendars } from "../../data/calendar";

const CONFIGS = [
  {
    heading: "Month view",
    config: {
      type: "calendar",
      entities: ["calendar.family", "calendar.work"],
    },
  },
  {
    heading: "List view with title",
    config: {
      type: "calendar",
      title: "This week",
      initial_view: "listWeek",
      entities: ["calendar.family", "calendar.work"],
    },
  },
  {
    heading: "Day view",
    config: {
      type: "calendar",
      initial_view: "dayGridDay",
      entities: ["calendar.family", "calendar.work"],
    },
  },
  {
    heading: "Add event button",
    config: {
      type: "calendar",
      show_add_event: true,
      entities: ["calendar.family"],
    },
  },
  {
    heading: "Failing calendar",
    config: {
      type: "calendar",
      initial_view: "listWeek",
      entities: ["calendar.family", "calendar.holidays"],
    },
  },
] satisfies DemoCardConfig<CalendarCardConfig>[];

@customElement("demo-lovelace-calendar-card")
class DemoCalendarCard extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    mockCalendars(hass);
    hass.addEntities(CALENDAR_ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-calendar-card": DemoCalendarCard;
  }
}
