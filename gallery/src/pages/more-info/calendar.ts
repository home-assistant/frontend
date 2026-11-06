import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HASSDomEvent } from "../../../../src/common/dom/fire_event";
import type { ShowDialogParams } from "../../../../src/dialogs/make-dialog-manager";
import { showDialog } from "../../../../src/dialogs/make-dialog-manager";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";
import { CALENDAR_ENTITIES, mockCalendars } from "../../data/calendar";

const ENTITIES = ["calendar.family", "calendar.empty", "calendar.holidays"];

@customElement("demo-more-info-calendar")
class DemoMoreInfoCalendar extends LitElement {
  @property({ attribute: false }) public hass!: MockHomeAssistant;

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
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    // Provided on this element, so the dialogs it opens get the mocks too
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    mockCalendars(hass);
    hass.addEntities(CALENDAR_ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-calendar": DemoMoreInfoCalendar;
  }
}
