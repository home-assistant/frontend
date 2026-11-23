import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HASSDomEvent } from "../../../../src/common/dom/fire_event";
import type { ShowDialogParams } from "../../../../src/dialogs/make-dialog-manager";
import { showDialog } from "../../../../src/dialogs/make-dialog-manager";
import { mockTimerList } from "../../../../demo/src/stubs/timer_list";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";
import { TIMER_LIST_ENTITIES, TIMER_LIST_TIMERS } from "../../data/timer_list";

@customElement("demo-more-info-timer-list")
class DemoMoreInfoTimerList extends LitElement {
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

  // Opens the dialog to start a timer
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

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass) {
      return nothing;
    }
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${TIMER_LIST_ENTITIES.map((ent) => ent.entity_id)}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    // Provided on this element, so the dialog it opens gets the mocks too
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.addEntities(TIMER_LIST_ENTITIES);
    mockTimerList(hass, TIMER_LIST_TIMERS);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-timer-list": DemoMoreInfoTimerList;
  }
}
