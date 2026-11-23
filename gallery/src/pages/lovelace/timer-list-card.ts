import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { mockTimerList } from "../../../../demo/src/stubs/timer_list";
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
    heading: "With title, without the fields to start a timer",
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
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(TIMER_LIST_ENTITIES);
    mockIcons(hass);
    mockTimerList(hass, TIMER_LIST_TIMERS);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-timer-list-card": DemoTimerListCard;
  }
}
