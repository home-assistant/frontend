import type { ActionDetail } from "@material/mwc-list";
import { mdiDotsVertical } from "@mdi/js";
import { DEFAULT_SCHEMA, Type } from "js-yaml";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-button-menu";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../src/components/ha-form/types";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-icon-button";
import "../../../../src/components/ha-list-item";
import "../../../../src/components/ha-switch";
import "../../../../src/components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../src/components/ha-yaml-editor";
import type {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
} from "../../../../src/data/hassio/addon";
import {
  setHassioAddonOption,
  validateHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import type { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { showConfirmationDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { suggestAddonRestart } from "../../dialogs/suggestAddonRestart";
import { hassioStyle } from "../../resources/hassio-style";
import type { Selector } from "../../../../src/data/selector";

const SUPPORTED_UI_TYPES = [
  "string",
  "select",
  "boolean",
  "integer",
  "float",
  "schema",
];

const ADDON_YAML_SCHEMA = DEFAULT_SCHEMA.extend([
  new Type("!secret", {
    kind: "scalar",
    construct: (data) => `!secret ${data}`,
  }),
]);

const MASKED_FIELDS = ["password", "secret", "token"];

@customElement("hassio-addon-config")
class HassioAddonConfig extends LitElement {
  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public disabled = false;

  @state() private _configHasChanged = false;

  @state() private _valid = true;

  @state() private _canShowSchema = false;

  @state() private _showOptional = false;

  @state() private _error?: string;

  @state() private _options?: Record<string, unknown>;

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _editor?: HaYamlEditor;

  public computeLabel = (entry: HaFormSchema): string =>
    this.addon.translations[this.hass.language]?.configuration?.[entry.name]
      ?.name ||
    this.addon.translations.en?.configuration?.[entry.name]?.name ||
    entry.name;

  public computeHelper = (entry: HaFormSchema): string =>
    this.addon.translations[this.hass.language]?.configuration?.[entry.name]
      ?.description ||
    this.addon.translations.en?.configuration?.[entry.name]?.description ||
    "";

  private _convertSchema = memoizeOne(
    // Convert supervisor schema to selectors
    (schema: readonly HaFormSchema[]): HaFormSchema[] =>
      this._convertSchemaElements(schema)
  );

  private _convertSchemaElements(
    schema: readonly HaFormSchema[]
  ): HaFormSchema[] {
    return schema.map((entry) => this._convertSchemaElement(entry));
  }

  private _convertSchemaElement(entry: any): HaFormSchema {
    const selector = this._convertSchemaElementToSelector(entry, false);
    if (selector) {
      return {
        name: entry.name,
        required: entry.required,
        selector,
      };
    }
    return entry;
  }

  private _convertSchemaElementToSelector(
    entry: any,
    force: boolean
  ): Selector | null {
    if (entry.type === "select") {
      return { select: { options: entry.options } };
    }
    if (entry.type === "string") {
      return entry.multiple
        ? { select: { options: [], multiple: true, custom_value: true } }
        : {
            text: {
              type: entry.format
                ? entry.format
                : MASKED_FIELDS.includes(entry.name)
                  ? "password"
                  : "text",
            },
          };
    }
    if (entry.type === "boolean") {
      return { boolean: {} };
    }
    if (entry.type === "schema") {
      return { object: {} };
    }
    if (entry.type === "float" || entry.type === "integer") {
      return {
        number: {
          mode: "box",
          step: entry.type === "float" ? "any" : undefined,
        },
      };
    }
    if (force) {
      return { object: {} };
    }
    return null;
  }

  private _filteredSchema = memoizeOne(
    (options: Record<string, unknown>, schema: HaFormSchema[]) =>
      schema.filter((entry) => entry.name in options || entry.required)
  );

  protected render(): TemplateResult {
    const showForm =
      !this._yamlMode && this._canShowSchema && this.addon.schema;
    const hasHiddenOptions =
      showForm &&
      JSON.stringify(this.addon.schema) !==
        JSON.stringify(
          this._filteredSchema(this.addon.options, this.addon.schema!)
        );
    return html`
      <h1>${this.addon.name}</h1>
      <ha-card outlined>
        <div class="header">
          <h2>
            ${this.supervisor.localize("addon.configuration.options.header")}
          </h2>
          <div class="card-menu">
            <ha-button-menu @action=${this._handleAction}>
              <ha-icon-button
                .label=${this.supervisor.localize("common.menu")}
                .path=${mdiDotsVertical}
                slot="trigger"
              ></ha-icon-button>
              <ha-list-item .disabled=${!this._canShowSchema || this.disabled}>
                ${this._yamlMode
                  ? this.supervisor.localize(
                      "addon.configuration.options.edit_in_ui"
                    )
                  : this.supervisor.localize(
                      "addon.configuration.options.edit_in_yaml"
                    )}
              </ha-list-item>
              <ha-list-item
                class=${!this.disabled ? "warning" : ""}
                .disabled=${this.disabled}
              >
                ${this.supervisor.localize("common.reset_defaults")}
              </ha-list-item>
            </ha-button-menu>
          </div>
        </div>

        <div class="card-content">
          ${showForm
            ? html`<ha-form
                .hass=${this.hass}
                .disabled=${this.disabled}
                .data=${this._options!}
                @value-changed=${this._configChanged}
                .computeLabel=${this.computeLabel}
                .computeHelper=${this.computeHelper}
                .schema=${this._convertSchema(
                  this._showOptional
                    ? this.addon.schema!
                    : this._filteredSchema(
                        this.addon.options,
                        this.addon.schema!
                      )
                )}
              ></ha-form>`
            : html`<ha-yaml-editor
                @value-changed=${this._configChanged}
                .yamlSchema=${ADDON_YAML_SCHEMA}
              ></ha-yaml-editor>`}
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          ${!this._yamlMode ||
          (this._canShowSchema && this.addon.schema) ||
          this._valid
            ? ""
            : html`
                <ha-alert alert-type="error">
                  ${this.supervisor.localize(
                    "addon.configuration.options.invalid_yaml"
                  )}
                </ha-alert>
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
            .disabled=${this.disabled ||
            !this._configHasChanged ||
            !this._valid}
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
      (entry) =>
        // @ts-ignore
        !SUPPORTED_UI_TYPES.includes(entry.type)
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
      this._options = ev.detail.value;
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
      destructive: true,
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
    } catch (err: any) {
      this._error = this.supervisor.localize("addon.failed_to_reset", {
        error: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _saveTapped(ev: CustomEvent): Promise<void> {
    if (this.disabled || !this._configHasChanged || !this._valid) {
      return;
    }

    const button = ev.currentTarget as any;
    const options: Record<string, unknown> = this._yamlMode
      ? this._editor?.value
      : this._options;
    const eventdata = {
      success: true,
      response: undefined,
      path: "options",
    };
    button.progress = true;

    this._error = undefined;

    try {
      const validation = await validateHassioAddonOption(
        this.hass,
        this.addon.slug,
        options
      );
      if (!validation.valid) {
        throw Error(validation.message);
      }
      await setHassioAddonOption(this.hass, this.addon.slug, {
        options,
      });

      this._configHasChanged = false;
      if (this.addon?.state === "started") {
        await suggestAddonRestart(this, this.hass, this.supervisor, this.addon);
      }
    } catch (err: any) {
      this._error = this.supervisor.localize("addon.failed_to_save", {
        error: extractApiErrorMessage(err),
      });
      eventdata.success = false;
    }
    button.progress = false;
    fireEvent(this, "hass-api-called", eventdata);
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

        .card-menu {
          float: right;
          z-index: 3;
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        ha-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        .header {
          display: flex;
          justify-content: space-between;
        }
        .header h2 {
          color: var(--ha-card-header-color, var(--primary-text-color));
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl));
          letter-spacing: -0.012em;
          line-height: var(--ha-line-height-expanded);
          padding: 12px 16px 16px;
          display: block;
          margin-block: 0px;
          font-weight: var(--ha-font-weight-normal);
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
