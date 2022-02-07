import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-icon-overflow-menu";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  mdiCheckboxBlankOutline,
  mdiCheckboxMarkedOutline,
  mdiContentCopy,
} from "@mdi/js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { slugify } from "../../../../../common/string/slugify";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import type { HaTextField } from "../../../../../components/ha-textfield";
import { showToast } from "../../../../../util/toast";
import {
  WebhookTrigger,
  AutomationConfig,
} from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

const ALLOWED_METHODS = ["GET", "HEAD", "POST", "PUT"];
const DEFAULT_METHODS = ["POST", "PUT"];
const DEFAULT_WEBHOOK_ID = "";

@customElement("ha-automation-trigger-webhook")
export class HaWebhookTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: WebhookTrigger;

  @property({ type: Boolean }) public disabled = false;

  @state() private _config?: AutomationConfig;

  private _unsub?: UnsubscribeFunc;

  public static get defaultConfig() {
    return {
      webhook_id: DEFAULT_WEBHOOK_ID,
      allow_internet: false,
      allow_methods: [...DEFAULT_METHODS],
    };
  }

  connectedCallback() {
    super.connectedCallback();
    const details = {
      callback: (config) => {
        this._config = config;
      },
    };
    fireEvent(this, "subscribe-automation-config", details);
    this._unsub = (details as any).unsub;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub();
    }
  }

  private _generateWebhookId(): string {
    // The webhook_id should be treated like a password. Generate a default
    // value that would be hard for someone to guess. This generates a
    // 144-bit random value. The output is a 24 character url-safe string.
    const randomBytes = crypto.getRandomValues(new Uint8Array(18));
    const base64Str = btoa(String.fromCharCode(...randomBytes));
    const urlSafeId = base64Str.replace(/\+/g, "-").replace(/\//g, "_");

    // Include the automation name to give the user context about what the
    // webhook_id is used for.
    const urlSafeAlias = slugify(this._config?.alias || "", "-");

    return `${urlSafeAlias}-${urlSafeId}`;
  }

  public willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("trigger")) {
      if (this.trigger.webhook_id === DEFAULT_WEBHOOK_ID) {
        this.trigger.webhook_id = this._generateWebhookId();
      }
      if (this.trigger.allow_internet === undefined) {
        this.trigger.allow_internet = false;
      }
      if (this.trigger.allow_methods === undefined) {
        this.trigger.allow_methods = [...DEFAULT_METHODS];
      }
    }
  }

  protected render() {
    const {
      webhook_id: webhookId,
      allow_internet: allowInternet,
      allow_methods: allowMethods,
    } = this.trigger;

    const overflowMenuItems = ALLOWED_METHODS.map((method) => ({
      path: this._selectedPath(allowMethods?.includes(method)),
      label: method,
      action: () => this._allowMethodsChanged(method),
    }));
    overflowMenuItems.push({
      path: this._selectedPath(allowInternet),
      label: this.hass.localize(
        "ui.panel.config.automation.editor.triggers.type.webhook.allow_internet"
      ),
      action: () => this._allowInternetChanged(),
    });

    return html`
      <div class="flex">
        <ha-textfield
          name="webhook_id"
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.webhook.webhook_id"
          )}
          .helper=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.webhook.webhook_id_helper"
          )}
          .disabled=${this.disabled}
          iconTrailing
          .value=${webhookId || ""}
          @input=${this._valueChanged}
        >
          <ha-icon-button
            @click=${this._copyUrl}
            slot="trailingIcon"
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.type.webhook.copy_url"
            )}
            .path=${mdiContentCopy}
          ></ha-icon-button>
        </ha-textfield>
        <ha-icon-overflow-menu
          .hass=${this.hass}
          .narrow=${true}
          .items=${overflowMenuItems}
        ></ha-icon-overflow-menu>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _allowInternetChanged(): void {
    const newTrigger = {
      ...this.trigger,
      allow_internet: !this.trigger.allow_internet,
    };
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _allowMethodsChanged(method: string): void {
    const methods = this.trigger.allow_methods ?? [];
    const newMethods = [...methods];
    if (methods.includes(method)) {
      newMethods.splice(newMethods.indexOf(method), 1);
    } else {
      newMethods.push(method);
    }
    const newTrigger = { ...this.trigger, allow_methods: newMethods };
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private async _copyUrl(ev): Promise<void> {
    const inputElement = ev.target.parentElement as HaTextField;
    const url = this.hass.hassUrl(`/api/webhook/${inputElement.value}`);

    await copyToClipboard(url);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _selectedPath(value?: boolean): string {
    return value ? mdiCheckboxMarkedOutline : mdiCheckboxBlankOutline;
  }

  static styles = css`
    .flex {
      display: flex;
    }

    ha-textfield {
      flex: 1;
    }

    ha-textfield > ha-icon-button {
      --mdc-icon-button-size: 24px;
      --mdc-icon-size: 18px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-webhook": HaWebhookTrigger;
  }
}
