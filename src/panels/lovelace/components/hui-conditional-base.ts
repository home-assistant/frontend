import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import {
  RenderTemplateResult,
  subscribeRenderTemplate,
} from "../../../data/ws-templates";
import { HomeAssistant } from "../../../types";
import { ConditionalCardConfig } from "../cards/types";
import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../common/validate-condition";
import { ConditionalRowConfig, LovelaceRow } from "../entity-rows/types";
import { LovelaceCard } from "../types";

@customElement("hui-conditional-base")
export class HuiConditionalBase extends ReactiveElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public editMode?: boolean;

  @property() protected _config?: ConditionalCardConfig | ConditionalRowConfig;

  protected _templateResults?: Record<string, RenderTemplateResult>;

  protected _templateUnsubRender?: Promise<UnsubscribeFunc>[];

  @property({ type: Boolean, reflect: true }) public hidden = false;

  protected _element?: LovelaceCard | LovelaceRow;

  protected createRenderRoot() {
    return this;
  }

  protected validateConfig(
    config: ConditionalCardConfig | ConditionalRowConfig
  ): void {
    if (!config.conditions) {
      throw new Error("No conditions configured");
    }

    if (!Array.isArray(config.conditions)) {
      throw new Error("Conditions need to be an array");
    }

    if (!validateConditionalConfig(config.conditions)) {
      throw new Error("Conditions are invalid");
    }

    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    this._config = config;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (!this._config) {
      return;
    }

    this._updateTemplates();
  }

  public disconnectedCallback() {
    if (this._templateUnsubRender) {
      this._templateUnsubRender.forEach(this._unsubscribeTemplate);
    }
  }

  protected async _updateTemplates() {
    if (this._templateUnsubRender) {
      this._templateUnsubRender.forEach(this._unsubscribeTemplate);
    }

    this._templateUnsubRender = [];
    this._templateResults = {};

    this._config?.conditions
      .filter((condition) => condition.template)
      .forEach((condition) => {
        this._subscribeTemplate(condition.template!);
      });
  }

  private async _subscribeTemplate(template: string) {
    if (!this.hass) {
      return;
    }
    const unsub = subscribeRenderTemplate(
      this.hass!.connection,
      (result) => {
        this._templateResults![template] = result;
        this.updateVisible();
      },
      {
        template: template,
        timeout: 3,
        strict: true,
      }
    );
    this._templateUnsubRender?.push(unsub);
    await unsub;
  }

  private async _unsubscribeTemplate(
    unsubPromise: Promise<UnsubscribeFunc>
  ): Promise<void> {
    if (!unsubPromise) {
      return;
    }

    try {
      const unsub = await unsubPromise;
      unsub();
    } catch (err: any) {
      if (err.code === "not_found") {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  protected update(changed: PropertyValues): void {
    super.update(changed);
    this.updateVisible();
  }

  protected updateVisible(): void {
    if (!this._element || !this.hass || !this._config) {
      return;
    }

    this._element.editMode = this.editMode;

    const visible =
      this.editMode ||
      checkConditionsMet(
        this._config.conditions,
        this.hass,
        this._templateResults!
      );
    this.hidden = !visible;

    this.style.setProperty("display", visible ? "" : "none");

    if (visible) {
      this._element.hass = this.hass;
      if (!this._element.parentElement) {
        this.appendChild(this._element);
      }
    } else if (this._element.parentElement) {
      this.removeChild(this._element);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-base": HuiConditionalBase;
  }
}
