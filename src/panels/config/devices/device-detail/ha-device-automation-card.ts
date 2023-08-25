import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-chip";
import "../../../../components/ha-chip-set";
import { showAutomationEditor } from "../../../../data/automation";
import {
  DeviceAction,
  DeviceAutomation,
} from "../../../../data/device_automation";
import { EntityRegistryEntry } from "../../../../data/entity_registry";
import { showScriptEditor } from "../../../../data/script";
import { buttonLinkStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";

declare global {
  interface HASSDomEvents {
    "entry-selected": undefined;
  }
}

export abstract class HaDeviceAutomationCard<
  T extends DeviceAutomation,
> extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public deviceId?: string;

  @property({ type: Boolean }) public script = false;

  @property({ attribute: false }) public automations: T[] = [];

  @property({ attribute: false }) entityReg?: EntityRegistryEntry[];

  @state() public _showSecondary = false;

  abstract headerKey: Parameters<typeof this.hass.localize>[0];

  abstract type: "action" | "condition" | "trigger";

  private _localizeDeviceAutomation: (
    hass: HomeAssistant,
    entityRegistry: EntityRegistryEntry[],
    automation: T
  ) => string;

  constructor(
    localizeDeviceAutomation: HaDeviceAutomationCard<T>["_localizeDeviceAutomation"]
  ) {
    super();
    this._localizeDeviceAutomation = localizeDeviceAutomation;
  }

  protected shouldUpdate(changedProps): boolean {
    if (changedProps.has("deviceId") || changedProps.has("automations")) {
      return true;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.language !== this.hass.language) {
      return true;
    }
    return false;
  }

  protected render() {
    if (this.automations.length === 0 || !this.entityReg) {
      return nothing;
    }
    const automations = this._showSecondary
      ? this.automations
      : this.automations.filter(
          (automation) => automation.metadata?.secondary === false
        );
    return html`
      <h3>${this.hass.localize(this.headerKey)}</h3>
      <div class="content">
        <ha-chip-set>
          ${automations.map(
            (automation, idx) => html`
              <ha-chip
                .index=${idx}
                @click=${this._handleAutomationClicked}
                class=${automation.metadata?.secondary ? "secondary" : ""}
              >
                ${this._localizeDeviceAutomation(
                  this.hass,
                  this.entityReg!,
                  automation
                )}
              </ha-chip>
            `
          )}
        </ha-chip-set>
        ${!this._showSecondary && automations.length < this.automations.length
          ? html`<button class="link" @click=${this._toggleSecondary}>
              Show ${this.automations.length - automations.length} more...
            </button>`
          : ""}
      </div>
    `;
  }

  private _toggleSecondary() {
    this._showSecondary = !this._showSecondary;
  }

  private _handleAutomationClicked(ev: CustomEvent) {
    const automation = { ...this.automations[(ev.currentTarget as any).index] };
    if (!automation) {
      return;
    }
    delete automation.metadata;
    if (this.script) {
      showScriptEditor({ sequence: [automation as DeviceAction] });
      fireEvent(this, "entry-selected");
      return;
    }
    const data = {};
    data[this.type] = [automation];
    showAutomationEditor(data);
    fireEvent(this, "entry-selected");
  }

  static styles = [
    buttonLinkStyle,
    css`
      h3 {
        color: var(--primary-text-color);
      }
      .secondary {
        --ha-chip-background-color: rgba(var(--rgb-primary-text-color), 0.07);
      }
      button.link {
        color: var(--primary-color);
      }
    `,
  ];
}
