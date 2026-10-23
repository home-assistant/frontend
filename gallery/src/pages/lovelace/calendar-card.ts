import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../src/common/dom/fire_event";
import type { ShowDialogParams } from "../../../../src/dialogs/make-dialog-manager";
import { showDialog } from "../../../../src/dialogs/make-dialog-manager";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { CalendarCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type { HomeAssistant } from "../../../../src/types";
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
  @state() private hass?: HomeAssistant;

  public provideHass(el) {
    el.hass = this.hass;
  }

  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener("show-dialog", this._dialogManager);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("show-dialog", this._dialogManager);
  }

  // Opens the event detail and editor dialogs of the calendar
  private _dialogManager = (e: HASSDomEvent<ShowDialogParams<unknown>>) => {
    const { dialogTag, dialogImport, dialogParams, addHistory, parentElement } =
      e.detail;
    showDialog(
      this,
      dialogTag,
      dialogParams,
      dialogImport,
      parentElement,
      addHistory
    );
  };

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    return html`<demo-cards
      .hass=${this.hass}
      .configs=${CONFIGS}
    ></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    // Provided on this element, so the dialogs it opens get the mocks too
    const hass = provideHass(this);
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
