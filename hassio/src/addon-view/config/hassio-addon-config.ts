import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import "@polymer/iron-autogrow-textarea/iron-autogrow-textarea";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-button-menu";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../src/components/ha-form/ha-form";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-switch";
import "../../../../src/components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../src/components/ha-yaml-editor";
import {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  setHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { showConfirmationDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { suggestAddonRestart } from "../../dialogs/suggestAddonRestart";
import { hassioStyle } from "../../resources/hassio-style";

const SUPPORTED_UI_TYPES = ["string", "select", "boolean", "integer", "float"];

@customElement("hassio-addon-config")
class HassioAddonConfig extends LitElement {
  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) private _configHasChanged = false;

  @property({ type: Boolean }) private _valid = true;

  @internalProperty() private _canShowSchema = false;

  @internalProperty() private _showOptional = false;

  @internalProperty() private _error?: string;

  @internalProperty() private _options?: Record<string, unknown>;

  @internalProperty() private _yamlMode = false;

  @query("ha-yaml-editor") private _editor?: HaYamlEditor;

  public computeLabel = (entry: HaFormSchema): string => {
    return (
      this.addon.translations[this.hass.language]?.configuration?.[entry.name]
        ?.name ||
      this.addon.translations.en?.configuration?.[entry.name].name ||
      entry.name
    );
  };

  private _filteredShchema = memoizeOne(
    (options: Record<string, unknown>, schema: HaFormSchema[]) => {
      return schema.filter((entry) => entry.name in options || entry.required);
    }
  );

  protected render(): TemplateResult {
    const showForm =
      !this._yamlMode && this._canShowSchema && this.addon.schema;
    const hasHiddenOptions =
      showForm &&
      JSON.stringify(this.addon.schema) !==
        JSON.stringify(
          this._filteredShchema(this.addon.options, this.addon.schema!)
        );
    return html`
      <h1>${this.addon.name}</h1>
      <ha-card>
        <div class="header">
          <h2>
            ${this.supervisor.localize("addon.configuration.options.header")}
          </h2>
          <div class="card-menu">
            <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
              <mwc-icon-button slot="trigger">
                <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
              </mwc-icon-button>
              <mwc-list-item .disabled=${!this._canShowSchema}>
                ${this._yamlMode
                  ? this.supervisor.localize(
                      "addon.configuration.options.edit_in_ui"
                    )
                  : this.supervisor.localize(
                      "addon.configuration.options.edit_in_yaml"
                    )}
              </mwc-list-item>
              <mwc-list-item class="warning">
                ${this.supervisor.localize("common.reset_defaults")}
              </mwc-list-item>
            </ha-button-menu>
          </div>
        </div>

        <div class="card-content">
          ${showForm
            ? html`<ha-form
                .data=${this._options!}
                @value-changed=${this._configChanged}
                .computeLabel=${this.computeLabel}
                .schema=${this._showOptional
                  ? this.addon.schema!
                  : this._filteredShchema(
                      this.addon.options,
                      this.addon.schema!
                    )}
              ></ha-form>`
            : html` <ha-yaml-editor
                @value-changed=${this._configChanged}
              ></ha-yaml-editor>`}
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
          ${!this._yamlMode ||
          (this._canShowSchema && this.addon.schema) ||
          this._valid
            ? ""
            : html`
                <div class="errors">
                  ${this.supervisor.localize(
                    "addon.configuration.options.invalid_yaml"
                  )}
                </div>
              `}
        </div>
        ${hasHiddenOptions
          ? html`<ha-formfield
              class="show-additional"
              .label=${this.supervisor.localize(
                "addon.configuration.options.show_unused_optional"
              )}
            >
              <ha-switch
                @change=${this._toggleOptional}
                .checked=${this._showOptional}
              >
              </ha-switch>
            </ha-formfield>`
          : ""}
        <div class="card-actions right">
          <ha-progress-button
            @click=${this._saveTapped}
            .disabled=${!this._configHasChanged || !this._valid}
          >
            ${this.supervisor.localize("common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._canShowSchema = !this.addon.schema!.find(
      // @ts-ignore
      (entry) => !SUPPORTED_UI_TYPES.includes(entry.type) || entry.multiple
    );
    this._yamlMode = !this._canShowSchema;
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("addon")) {
      this._options = { ...this.addon.options };
    }
    super.updated(changedProperties);
    if (
      changedProperties.has("_yamlMode") ||
      changedProperties.has("_options")
    ) {
      if (this._yamlMode) {
        const editor = this._editor;
        if (editor) {
          editor.setValue(this._options!);
        }
      }
    }
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = !this._yamlMode;
        break;
      case 1:
        this._resetTapped(ev);
        break;
    }
  }

  private _toggleOptional() {
    this._showOptional = !this._showOptional;
  }

  private _configChanged(ev): void {
    if (this.addon.schema && this._canShowSchema && !this._yamlMode) {
      this._valid = true;
      this._configHasChanged = true;
      this._options! = ev.detail.value;
    } else {
      this._configHasChanged = true;
      this._valid = ev.detail.isValid;
    }
  }

  private async _resetTapped(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.supervisor.localize("confirm.reset_options.title"),
      text: this.supervisor.localize("confirm.reset_options.text"),
      confirmText: this.supervisor.localize("common.reset_options"),
      dismissText: this.supervisor.localize("common.cancel"),
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      options: null,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      this._configHasChanged = false;
      const eventdata = {
        success: true,
        response: undefined,
        path: "options",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = this.supervisor.localize(
        "addon.common.update_available",
        "error",
        extractApiErrorMessage(err)
      );
    }
    button.progress = false;
  }

  private async _saveTapped(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    this._error = undefined;

    try {
      await setHassioAddonOption(this.hass, this.addon.slug, {
        options: this._yamlMode ? this._editor?.value : this._options,
      });

      this._configHasChanged = false;
      const eventdata = {
        success: true,
        response: undefined,
        path: "options",
      };
      fireEvent(this, "hass-api-called", eventdata);
      if (this.addon?.state === "started") {
        await suggestAddonRestart(this, this.hass, this.supervisor, this.addon);
      }
    } catch (err) {
      this._error = this.supervisor.localize(
        "addon.configuration.options.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
    button.progress = false;
  }

  static get styles(): CSSResult[] {
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
        .errors {
          color: var(--error-color);
          margin-top: 16px;
        }
        iron-autogrow-textarea {
          width: 100%;
          font-family: var(--code-font-family, monospace);
        }
        .syntaxerror {
          color: var(--error-color);
        }
        .card-menu {
          float: right;
          z-index: 3;
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        .header {
          display: flex;
          justify-content: space-between;
        }
        .header h2 {
          color: var(--ha-card-header-color, --primary-text-color);
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-card-header-font-size, 24px);
          letter-spacing: -0.012em;
          line-height: 48px;
          padding: 12px 16px 16px;
          display: block;
          margin-block: 0px;
          font-weight: normal;
        }
        .card-actions.right {
          justify-content: flex-end;
        }

        .show-additional {
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-config": HassioAddonConfig;
  }
}
