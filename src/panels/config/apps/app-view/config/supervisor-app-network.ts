import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-formfield";
import type {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
} from "../../../../../data/hassio/addon";
import { setHassioAddonOption } from "../../../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../../../data/hassio/common";
import { DirtyStateProviderMixin } from "../../../../../mixins/dirty-state-provider-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { supervisorAppsStyle } from "../../resources/supervisor-apps-style";
import { suggestSupervisorAppRestart } from "../dialogs/suggestSupervisorAppRestart";

@customElement("supervisor-app-network")
class SupervisorAppNetwork extends DirtyStateProviderMixin<
  Record<string, number | null>
>()(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property({ type: Boolean }) public disabled = false;

  @state() private _showOptional = false;

  @state() private _error?: string;

  @state() private _config?: Record<string, number | null>;

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const config = this._config;

    const hasHiddenOptions = Object.keys(config).find(
      (entry) => config[entry] === null
    );

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.apps.configuration.network.header"
        )}
      >
        <div class="card-content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.apps.configuration.network.introduction"
            )}
          </p>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}

          <ha-form
            .disabled=${this.disabled}
            .data=${this._config}
            @value-changed=${this._configChanged}
            .computeLabel=${this._computeLabel}
            .computeHelper=${this._computeHelper}
            .schema=${this._createSchema(this._config, this._showOptional)}
          ></ha-form>
        </div>
        ${hasHiddenOptions
          ? html`<ha-formfield
              class="show-optional"
              .label=${this.hass.localize(
                "ui.panel.config.apps.configuration.network.show_disabled"
              )}
            >
              <ha-switch
                @change=${this._toggleOptional}
                .checked=${this._showOptional}
              >
              </ha-switch>
            </ha-formfield>`
          : nothing}
        <div class="card-actions">
          <ha-progress-button
            variant="danger"
            appearance="plain"
            .disabled=${this.disabled}
            @click=${this._resetTapped}
          >
            ${this.hass.localize(
              "ui.panel.config.apps.configuration.network.reset_defaults"
            )}
          </ha-progress-button>
          <ha-progress-button
            @click=${this._saveTapped}
            .disabled=${!this.isDirtyState || this.disabled}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("addon")) {
      this._setNetworkConfig();
    }
  }

  private _createSchema = memoizeOne(
    (
      config: Record<string, number | null>,
      showOptional: boolean
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
            unit_of_measurement: entry,
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
    const config = this.addon.network || {};
    this._config = config;
    this._initDirtyTracking({ type: "shallow" }, config);
  }

  private _configChanged(ev: CustomEvent): void {
    this._config = ev.detail.value;
    this._updateDirtyState(ev.detail.value);
  }

  private async _resetTapped(ev: CustomEvent): Promise<void> {
    if (this.disabled) {
      return;
    }

    const button = ev.currentTarget as any;
    const data: HassioAddonSetOptionParams = {
      network: null,
    };

    try {
      await setHassioAddonOption(this.hass.callWS, this.addon.slug, data);
      this._markDirtyStateClean();
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      button.actionSuccess();
      fireEvent(this, "hass-api-called", eventdata);
      if (this.addon?.state === "started") {
        await suggestSupervisorAppRestart(this, this.hass, this.addon);
      }
    } catch (err: any) {
      this._error = this.hass.localize(
        "ui.panel.config.apps.dashboard.failed_to_reset",
        {
          error: extractApiErrorMessage(err),
        }
      );
      button.actionError();
    }
  }

  private _toggleOptional() {
    this._showOptional = !this._showOptional;
  }

  private async _saveTapped(ev: CustomEvent): Promise<void> {
    if (!this.isDirtyState || this.disabled) {
      return;
    }

    const button = ev.currentTarget as any;

    this._error = undefined;
    const networkconfiguration: Record<string, number | null> = {};
    Object.entries(this._config!).forEach(([key, value]) => {
      networkconfiguration[key] = value ?? null;
    });

    const data: HassioAddonSetOptionParams = {
      network: networkconfiguration,
    };

    try {
      await setHassioAddonOption(this.hass.callWS, this.addon.slug, data);
      this._markDirtyStateClean();
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      button.actionSuccess();
      fireEvent(this, "hass-api-called", eventdata);
      if (this.addon?.state === "started") {
        await suggestSupervisorAppRestart(this, this.hass, this.addon);
      }
    } catch (err: any) {
      this._error = this.hass.localize(
        "ui.panel.config.apps.dashboard.failed_to_save",
        {
          error: extractApiErrorMessage(err),
        }
      );
      button.actionError();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      supervisorAppsStyle,
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
    "supervisor-app-network": SupervisorAppNetwork;
  }
}
