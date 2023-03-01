import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../src/components/ha-form/types";
import {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  setHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { suggestAddonRestart } from "../../dialogs/suggestAddonRestart";
import { hassioStyle } from "../../resources/hassio-style";

@customElement("hassio-addon-network")
class HassioAddonNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @state() private _showOptional = false;

  @state() private _configHasChanged = false;

  @state() private _error?: string;

  @state() private _config?: Record<string, any>;

  public connectedCallback(): void {
    super.connectedCallback();
    this._setNetworkConfig();
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const hasHiddenOptions = Object.keys(this._config).find(
      (entry) => this._config![entry] === null
    );

    return html`
      <ha-card
        outlined
        .header=${this.supervisor.localize(
          "addon.configuration.network.header"
        )}
      >
        <div class="card-content">
          <p>
            ${this.supervisor.localize(
              "addon.configuration.network.introduction"
            )}
          </p>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}

          <ha-form
            .data=${this._config}
            @value-changed=${this._configChanged}
            .computeLabel=${this._computeLabel}
            .computeHelper=${this._computeHelper}
            .schema=${this._createSchema(
              this._config,
              this._showOptional,
              this.hass.userData?.showAdvanced || false
            )}
          ></ha-form>
        </div>
        ${hasHiddenOptions
          ? html`<ha-formfield
              class="show-optional"
              .label=${this.supervisor.localize(
                "addon.configuration.network.show_disabled"
              )}
            >
              <ha-switch
                @change=${this._toggleOptional}
                .checked=${this._showOptional}
              >
              </ha-switch>
            </ha-formfield>`
          : ""}
        <div class="card-actions">
          <ha-progress-button class="warning" @click=${this._resetTapped}>
            ${this.supervisor.localize("common.reset_defaults")}
          </ha-progress-button>
          <ha-progress-button
            @click=${this._saveTapped}
            .disabled=${!this._configHasChanged}
          >
            ${this.supervisor.localize("common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  protected update(changedProperties: PropertyValues): void {
    super.update(changedProperties);
    if (changedProperties.has("addon")) {
      this._setNetworkConfig();
    }
  }

  private _createSchema = memoizeOne(
    (
      config: Record<string, number>,
      showOptional: boolean,
      advanced: boolean
    ): HaFormSchema[] =>
      (showOptional
        ? Object.keys(config)
        : Object.keys(config).filter((entry) => config[entry] !== null)
      ).map((entry) => ({
        name: entry,
        selector: {
          number: {
            mode: "box",
            min: 0,
            max: 65535,
            unit_of_measurement: advanced ? entry : undefined,
          },
        },
      }))
  );

  private _computeLabel = (_: HaFormSchema): string => "";

  private _computeHelper = (item: HaFormSchema): string =>
    this.addon.translations[this.hass.language]?.network?.[item.name] ||
    this.addon.translations.en?.network?.[item.name] ||
    this.addon.network_description?.[item.name] ||
    item.name;

  private _setNetworkConfig(): void {
    this._config = this.addon.network || {};
  }

  private async _configChanged(ev: CustomEvent): Promise<void> {
    this._configHasChanged = true;
    this._config! = ev.detail.value;
  }

  private async _resetTapped(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    const data: HassioAddonSetOptionParams = {
      network: null,
    };

    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      this._configHasChanged = false;
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      button.actionSuccess();
      fireEvent(this, "hass-api-called", eventdata);
      if (this.addon?.state === "started") {
        await suggestAddonRestart(this, this.hass, this.supervisor, this.addon);
      }
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.failed_to_reset",
        "error",
        extractApiErrorMessage(err)
      );
      button.actionError();
    }
  }

  private _toggleOptional() {
    this._showOptional = !this._showOptional;
  }

  private async _saveTapped(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;

    this._error = undefined;
    const networkconfiguration = {};
    Object.entries(this._config!).forEach(([key, value]) => {
      networkconfiguration[key] = value ?? null;
    });

    const data: HassioAddonSetOptionParams = {
      network: networkconfiguration,
    };

    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      this._configHasChanged = false;
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      button.actionSuccess();
      fireEvent(this, "hass-api-called", eventdata);
      if (this.addon?.state === "started") {
        await suggestAddonRestart(this, this.hass, this.supervisor, this.addon);
      }
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
      button.actionError();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          display: block;
        }
        .card-actions {
          display: flex;
          justify-content: space-between;
        }
        .show-optional {
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-network": HassioAddonNetwork;
  }
}
