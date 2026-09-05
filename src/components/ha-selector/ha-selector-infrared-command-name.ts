import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  AutomationConfig,
  PlatformTrigger,
  Trigger,
} from "../../data/automation";
import { flattenTriggers } from "../../data/automation";
import type { InfraredCommand } from "../../data/infrared";
import type {
  InfraredCommandNameSelector,
  SelectSelector,
} from "../../data/selector";
import { isTriggerList } from "../../data/trigger";
import type { HomeAssistant } from "../../types";
import "./ha-selector";

const isInfraredTrigger = (trigger: Trigger): trigger is PlatformTrigger =>
  !isTriggerList(trigger) && trigger.trigger === "infrared";

// The names the automation's infrared triggers captured, in the order they
// were captured, without the duplicates a second trigger can introduce.
const capturedNames = (config?: AutomationConfig): string[] => {
  const names = flattenTriggers(config?.triggers)
    .filter(isInfraredTrigger)
    .flatMap(
      (trigger) => (trigger.options?.commands ?? []) as InfraredCommand[]
    )
    .map((command) => command?.name)
    .filter(Boolean);
  return Array.from(new Set(names));
};

@customElement("ha-selector-infrared_command_name")
export class HaSelectorInfraredCommandName extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public selector!: InfraredCommandNameSelector;

  @property({ attribute: false }) public value?: string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _names: string[] = [];

  private _unsub?: UnsubscribeFunc;

  public override connectedCallback(): void {
    super.connectedCallback();
    const details = {
      callback: (config?: AutomationConfig) => {
        this._names = capturedNames(config);
      },
    };
    fireEvent(this, "subscribe-automation-config", details);
    this._unsub = (details as { unsub?: UnsubscribeFunc }).unsub;
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsub?.();
    this._unsub = undefined;
  }

  protected render() {
    // A name the condition already holds stays selectable even when the
    // trigger that captured it is gone, so the value is never hidden.
    const options = this._options(this._names, this.value);

    if (!options.length) {
      return this.hass.localize(
        "ui.components.selectors.infrared_command_name.no_commands"
      );
    }

    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${this._selector(options)}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        @value-changed=${this._valueChanged}
      ></ha-selector>
    `;
  }

  private _options = memoizeOne((names: string[], value?: string[]) =>
    Array.from(new Set([...names, ...ensureArray(value ?? [])]))
  );

  private _selector = memoizeOne((options: string[]): SelectSelector => ({
    select: { multiple: true, sort: false, options },
  }));

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-infrared_command_name": HaSelectorInfraredCommandName;
  }
}
