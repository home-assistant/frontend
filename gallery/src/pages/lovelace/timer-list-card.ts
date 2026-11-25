import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HASSDomEvent } from "../../../../src/common/dom/fire_event";
import type { ShowDialogParams } from "../../../../src/dialogs/make-dialog-manager";
import { showDialog } from "../../../../src/dialogs/make-dialog-manager";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { mockTimerList } from "../../../../demo/src/stubs/timer_list";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { TimerListCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type { DemoCardConfig } from "../../components/demo-card";
import "../../components/demo-cards";
import { TIMER_LIST_ENTITIES, TIMER_LIST_TIMERS } from "../../data/timer_list";

const CONFIGS = [
  {
    heading: "Timers",
    config: {
      type: "timer-list",
      entity: "timer_list.kitchen",
    },
  },
  {
    heading: "With title, without the add timer button",
    config: {
      type: "timer-list",
      title: "Kitchen",
      entity: "timer_list.kitchen",
      hide_create: true,
    },
  },
  {
    heading: "No timers",
    config: {
      type: "timer-list",
      entity: "timer_list.empty",
    },
  },
  {
    heading: "No supported actions",
    config: {
      type: "timer-list",
      entity: "timer_list.read_only",
    },
  },
  {
    heading: "Unavailable",
    config: {
      type: "timer-list",
      entity: "timer_list.unavailable",
    },
  },
] satisfies DemoCardConfig<TimerListCardConfig>[];

@customElement("demo-lovelace-timer-list-card")
class DemoTimerListCard extends LitElement {
  @property({ attribute: false }) public hass?: MockHomeAssistant;

  private _stopTimerList?: () => void;

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
    this._stopTimerList?.();
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
    return html`<demo-cards
      .hass=${this.hass}
      .configs=${CONFIGS}
    ></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    // Provided on this element, so the dialog it opens gets the mocks too
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(TIMER_LIST_ENTITIES);
    mockIcons(hass);
    this._stopTimerList = mockTimerList(hass, TIMER_LIST_TIMERS);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-timer-list-card": DemoTimerListCard;
  }
}
