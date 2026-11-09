import { mdiClose, mdiContentCopy } from "@mdi/js";
import { dump } from "js-yaml";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeKeys } from "../../../../../common/translations/localize";
import { sanitizeHttpUrl } from "../../../../../common/url/sanitize-http-url";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-switch";
import type {
  MQTTExplorerConfig,
  MQTTExplorerSource,
} from "../../../../../data/mqtt";
import type { HomeAssistant } from "../../../../../types";
import { showToast } from "../../../../../util/toast";
import { sourceName } from "./mqtt-network-data";

@customElement("mqtt-config-view")
class MqttConfigView extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // The name of the device, entity, trigger or tag
  @property({ attribute: false }) public name!: string;

  // What the item is, like "Device"
  @property({ attribute: false }) public kind!: string;

  // Undefined while loading
  @property({ attribute: false }) public configs?: MQTTExplorerConfig[];

  @property({ attribute: false }) public sources: MQTTExplorerSource[] = [];

  // The platform of an entity, which can be shown as YAML
  @property({ attribute: false }) public platform?: string;

  // The config of a device from YAML is part of the config of its entities,
  // so it is not shown on its own
  @property({ type: Boolean }) public device = false;

  @property({ type: Boolean }) public failed = false;

  // The name opens the entity or device
  @property({ type: Boolean }) public openable = false;

  // An entity from YAML, which can only be matched to its config by its
  // unique ID
  @property({ attribute: "yaml-entity", type: Boolean })
  public yamlEntity = false;

  // The format chosen per source for a discovered entity, which shows as JSON
  // without a choice
  @state() private _yaml: Record<string, boolean> = {};

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (changedProps.has("name") || changedProps.has("kind")) {
      this._yaml = {};
    }
  }

  // Only an entity discovered on its own can be shown as JSON. The JSON of an
  // entity from YAML or a subentry says little without a discovery topic, and
  // that of an entity from device discovery is not what was discovered.
  private _canSwitch(config: MQTTExplorerConfig): boolean {
    return (
      !!this.platform && config.type === "discovery" && !config.device_discovery
    );
  }

  private _showYaml(config: MQTTExplorerConfig): boolean {
    if (!this.platform) {
      return false;
    }
    return this._canSwitch(config)
      ? (this._yaml[config.source] ?? false)
      : true;
  }

  private _localize(key: string): string {
    return this.hass.localize(
      `ui.panel.config.mqtt.visualization.config_view.${key}` as LocalizeKeys
    );
  }

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="title">
          ${
            this.openable
              ? html`<button class="name link" @click=${this._open}>
                  ${this.name}
                </button>`
              : html`<span class="name">${this.name}</span>`
          }
          <span class="secondary">${this.kind}</span>
        </div>
        <ha-icon-button
          .path=${mdiClose}
          .label=${this.hass.localize("ui.common.close")}
          @click=${this._close}
        ></ha-icon-button>
      </div>
      ${this._renderContent()}
    `;
  }

  private _renderContent() {
    if (this.failed) {
      return html`<ha-alert alert-type="error"
        >${this._localize("load_failed")}</ha-alert
      >`;
    }
    if (!this.configs) {
      return html`<div class="center"><ha-spinner></ha-spinner></div>`;
    }
    if (!this.configs.length) {
      return html`<p class="secondary">
        ${this._localize(this.yamlEntity ? "no_unique_id" : "no_config")}
      </p>`;
    }
    return this.configs.map((config) => this._renderConfig(config));
  }

  private _renderConfig(config: MQTTExplorerConfig) {
    const source = this.sources.find((s) => s.id === config.source);
    const origin = config.origin;
    // The origin is published by any MQTT client
    const supportUrl = sanitizeHttpUrl(origin?.support_url);
    const title = source ? sourceName(source, this.hass) : config.source;
    if (this.device && config.type === "yaml") {
      return html`<p class="secondary">${this._localize("yaml_device")}</p>`;
    }
    if (this.device && config.type === "subentry") {
      return html`<p class="secondary">
        ${this._localize("subentry_device")}
        <button
          class="link"
          data-source=${config.source}
          @click=${this._reconfigure}
        >
          ${this._localize("reconfigure_subentry")}
        </button>
      </p>`;
    }
    // A device discovered with its entities only has the device part of their
    // config, which belongs to the discovery topic of an entity
    const devicePart = this.device && !config.device_discovery;
    const yaml = this._showYaml(config);
    const formatted = devicePart
      ? dump(config.payload)
      : this._format(config.payload, yaml);
    return html`
      <div class="section-header">
        <h3>${title}</h3>
        ${
          this._canSwitch(config)
            ? html`<ha-switch
                class="yaml"
                .checked=${yaml}
                data-source=${config.source}
                @change=${this._handleYaml}
                >${this._localize("show_as_yaml")}</ha-switch
              >`
            : nothing
        }
      </div>
      <dl>
        ${
          config.discovery_topic && !devicePart
            ? html`<dt>
                  ${this._localize(
                    // An entity from device discovery was discovered with its
                    // device
                    this.platform && config.device_discovery
                      ? "device_discovery_topic"
                      : "discovery_topic"
                  )}
                </dt>
                <dd class="copyable">
                  <code>${config.discovery_topic}</code>
                  <ha-icon-button
                    .path=${mdiContentCopy}
                    .label=${this._localize("copy_discovery_topic")}
                    data-text=${config.discovery_topic}
                    @click=${this._copy}
                  ></ha-icon-button>
                </dd>`
            : nothing
        }
        ${
          origin
            ? html`<dt>${this._localize("origin")}</dt>
                <dd>
                  ${origin.name}${
                    origin.sw_version ? ` ${origin.sw_version}` : nothing
                  }${
                    supportUrl
                      ? html` ·
                          <a href=${supportUrl} target="_blank" rel="noreferrer"
                            >${this._localize("support")}</a
                          >`
                      : nothing
                  }
                </dd>`
            : nothing
        }
      </dl>
      <div class="code-label">${this._localize(this._configLabel(config))}</div>
      <div class="code">
        <pre dir="ltr">${formatted}</pre>
        <ha-icon-button
          .path=${mdiContentCopy}
          .label=${this._localize("copy_config")}
          data-text=${formatted}
          @click=${this._copy}
        ></ha-icon-button>
      </div>
    `;
  }

  // What the shown config is
  private _configLabel(config: MQTTExplorerConfig): string {
    if (this.device) {
      return config.device_discovery
        ? "device_discovery_payload"
        : "device_config";
    }
    if (config.type === "discovery" && !config.device_discovery) {
      return "discovery_payload";
    }
    return this.platform ? "entity_config" : "discovery_payload";
  }

  private _format(payload: Record<string, unknown>, yaml: boolean): string {
    if (!yaml || !this.platform) {
      return JSON.stringify(payload, null, 2);
    }
    // In YAML the platform is the key the config is listed under
    const { platform: _platform, ...config } = payload;
    return dump({ [this.platform]: [config] });
  }

  private _handleYaml(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    this._yaml = {
      ...this._yaml,
      [target.dataset.source!]: target.checked,
    };
  }

  private async _copy(ev: Event): Promise<void> {
    await copyToClipboard((ev.currentTarget as HTMLElement).dataset.text!);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _close(): void {
    fireEvent(this, "mqtt-config-view-closed");
  }

  private _open(): void {
    fireEvent(this, "mqtt-config-view-open");
  }

  private _reconfigure(ev: Event): void {
    fireEvent(this, "mqtt-config-view-reconfigure", {
      source: (ev.currentTarget as HTMLElement).dataset.source!,
    });
  }

  static readonly styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .header,
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ha-space-2);
    }
    .title {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .name {
      font-size: var(--ha-font-size-l);
      word-break: break-word;
    }
    .link {
      padding: 0;
      border: none;
      background: none;
      font-family: inherit;
      font-size: inherit;
      text-align: start;
      color: var(--primary-color);
      cursor: pointer;
    }
    .link:hover {
      text-decoration: underline;
    }
    .link.name {
      font-size: var(--ha-font-size-l);
    }
    .secondary {
      color: var(--secondary-text-color);
    }
    .center {
      display: flex;
      justify-content: center;
      padding: var(--ha-space-4);
    }
    .section-header {
      margin-top: var(--ha-space-4);
    }
    .yaml {
      font-size: var(--ha-font-size-s);
    }
    h3 {
      flex: 1;
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      margin: 0;
    }
    .copyable {
      display: flex;
      align-items: flex-start;
      gap: var(--ha-space-1);
    }
    .copyable code {
      flex: 1;
      min-width: 0;
      padding-top: var(--ha-space-1);
    }
    .copyable ha-icon-button {
      --ha-icon-button-size: 32px;
      --mdc-icon-size: 18px;
      margin-top: calc(var(--ha-space-1) * -1);
    }
    .code-label {
      margin-bottom: var(--ha-space-1);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .code {
      position: relative;
    }
    .code ha-icon-button {
      position: absolute;
      top: var(--ha-space-1);
      inset-inline-end: var(--ha-space-1);
      --ha-icon-button-size: 32px;
      --mdc-icon-size: 18px;
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--ha-space-1) var(--ha-space-3);
      margin: var(--ha-space-2) 0;
    }
    dt {
      color: var(--secondary-text-color);
    }
    dd {
      margin: 0;
      word-break: break-all;
    }
    pre {
      margin: 0;
      padding: var(--ha-space-2);
      /* Room for the copy button */
      padding-inline-end: var(--ha-space-10);
      max-height: 480px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
      background-color: var(
        --code-editor-background-color,
        var(--secondary-background-color)
      );
      border-radius: var(--ha-border-radius-md);
      font-family: var(--ha-font-family-code);
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-config-view": MqttConfigView;
  }
  interface HASSDomEvents {
    "mqtt-config-view-closed": undefined;
    "mqtt-config-view-open": undefined;
    "mqtt-config-view-reconfigure": { source: string };
  }
}
