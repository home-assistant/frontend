import type { PropertyValues, TemplateResult, CSSResultGroup } from "lit";
import { html, css, nothing, LitElement } from "lit";
import { mdiContentSave, mdiHelpCircle } from "@mdi/js";
import { classMap } from "lit/directives/class-map";
import { property, state } from "lit/decorators";
import "../../../layouts/hass-subpage";
import type { HassEntity } from "home-assistant-js-websocket";
import { consume } from "@lit-labs/context";
import type { HomeAssistant, Route } from "../../../types";
import "../../../components/ha-fab";
import "../../../components/ha-button-menu";
import "../../../components/ha-list-item";
import "@material/mwc-button/mwc-button";
import type {
  BlueprintConfig,
  BlueprintEntity,
  BlueprintInput,
} from "../../../data/blueprint";
import {
  fetchBlueprintFileConfig,
  getBlueprintEditorInitData,
  saveBlueprintConfig,
} from "../../../data/blueprint";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { afterNextRender } from "../../../common/util/render-status";
import { showToast } from "../../../util/toast";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import { updateEntityRegistryEntry } from "../../../data/entity_registry";
import { promiseTimeout } from "../../../common/util/promise-timeout";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { navigate } from "../../../common/navigate";
import type { EntityRegistryUpdate } from "../automation/automation-rename-dialog/show-dialog-automation-rename";
import { showBlueprintRenameDialog } from "./blueprint-rename-dialog/show-dialog-blueprint-rename";
import { fullEntitiesContext } from "../../../data/context";
import { documentationUrl } from "../../../util/documentation-url";
import "./input/ha-blueprint-input";
import { haStyle } from "../../../resources/styles";

export abstract class HaBlueprintGenericEditor extends PreventUnsavedMixin(
  KeyboardShortcutMixin(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public blueprints!: BlueprintEntity[];

  @state() private _dirty = false;

  @state() protected _readOnly = false;

  @state() private _saving = false;

  @state() private _validationErrors?: (string | TemplateResult)[];

  @state() private _errors?: string;

  @state() private _yamlErrors?: string;

  @state() private blueprintId?: string;

  @state() private _newBlueprintId?: string;

  @state() private _entityId?: string;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityRegistry!: EntityRegistryEntry[];

  private _entityRegistryUpdate?: EntityRegistryUpdate;

  protected abstract _config: BlueprintConfig | undefined;

  protected abstract getDefaultConfig(): BlueprintConfig;

  private _entityRegCreated?: (
    value: PromiseLike<EntityRegistryEntry> | EntityRegistryEntry
  ) => void;

  private _configSubscriptions: Record<
    string,
    (config?: BlueprintConfig) => void
  > = {};

  protected abstract renderEditor(
    stateObj: HassEntity | undefined
  ): TemplateResult | symbol;

  protected abstract renderHeader(): TemplateResult | symbol;

  protected abstract normalizeBlueprintConfig(
    config: Partial<BlueprintConfig>
  ): BlueprintConfig;

  protected abstract checkValidation(): Promise<void>;

  protected _valueChanged(ev: CustomEvent<{ value: BlueprintConfig }>) {
    ev.stopPropagation();

    this._config = ev.detail.value;
    this._updateInputsInHass();
    if (this._readOnly) {
      return;
    }
    this._dirty = true;
    this._errors = undefined;
  }

  private async _promptBlueprintAlias(): Promise<boolean> {
    return new Promise((resolve) => {
      showBlueprintRenameDialog(this, {
        config: this._config!,
        updateConfig: (config, entityRegistryUpdate) => {
          this._config = config;
          this._entityRegistryUpdate = entityRegistryUpdate;
          this._dirty = true;
          this.requestUpdate();
          resolve(true);
        },
        onClose: () => resolve(false),
        entityRegistryUpdate: this._entityRegistryUpdate,
        entityRegistryEntry: this._entityRegistry.find(
          (entry) => entry.unique_id === this.blueprintId
        ),
      });
    });
  }

  private async _saveBlueprint(): Promise<void> {
    if (this._yamlErrors) {
      showToast(this, {
        message: this._yamlErrors,
      });
      return;
    }

    const id = this.blueprintId || String(Date.now());
    if (!this.blueprintId) {
      const saved = await this._promptBlueprintAlias();
      if (!saved) {
        return;
      }
    }

    this._saving = true;
    this._validationErrors = undefined;

    let entityRegPromise: Promise<EntityRegistryEntry> | undefined;
    if (this._entityRegistryUpdate !== undefined && !this._entityId) {
      this._newBlueprintId = id;
      entityRegPromise = new Promise<EntityRegistryEntry>((resolve) => {
        this._entityRegCreated = resolve;
      });
    }

    try {
      await saveBlueprintConfig(this.hass, id, this._config!);

      if (this._entityRegistryUpdate !== undefined) {
        let entityId = this._entityId;

        // wait for blueprint to appear in entity registry when creating a new blueprint
        if (entityRegPromise) {
          try {
            const blueprint = await promiseTimeout(5000, entityRegPromise);
            entityId = blueprint.entity_id;
          } catch (e) {
            if (e instanceof Error && e.name === "TimeoutError") {
              showAlertDialog(this, {
                title: this.hass.localize(
                  "ui.panel.config.blueprint.editor.new_blueprint_setup_failed_title",
                  {
                    type: this.hass.localize(
                      "ui.panel.config.blueprint.editor.type_blueprint"
                    ),
                  }
                ),
                text: this.hass.localize(
                  "ui.panel.config.blueprint.editor.new_blueprint_setup_failed_text",
                  {
                    type: this.hass.localize(
                      "ui.panel.config.blueprint.editor.type_blueprint"
                    ),
                    types: this.hass.localize(
                      "ui.panel.config.blueprint.editor.type_blueprint_plural"
                    ),
                  }
                ),
                warning: true,
              });
            } else {
              throw e;
            }
          }
        }

        if (entityId) {
          await updateEntityRegistryEntry(this.hass, entityId, {
            categories: {
              blueprint: this._entityRegistryUpdate.category || null,
            },
            labels: this._entityRegistryUpdate.labels || [],
            area_id: this._entityRegistryUpdate.area || null,
          });
        }
      }

      this._dirty = false;

      if (!this.blueprintId) {
        navigate(`/config/blueprint/edit/${id}`, { replace: true });
      }
    } catch (errors: any) {
      this._errors = errors.body?.message || errors.error || errors.body;
      showToast(this, {
        message: errors.body?.message || errors.error || errors.body,
      });
      throw errors;
    } finally {
      this._saving = false;
    }
  }

  private async _loadConfig() {
    try {
      const config = await fetchBlueprintFileConfig(
        this.hass,
        this.blueprintId as string
      );
      this._dirty = false;
      this._readOnly = false;
      this._config = this.normalizeBlueprintConfig(config);
      await this.checkValidation();
    } catch (err: any) {
      const entity = this._entityRegistry.find(
        (ent) =>
          ent.platform === "blueprint" && ent.unique_id === this.blueprintId
      );
      if (entity) {
        navigate(`/config/blueprint/show/${entity.entity_id}`, {
          replace: true,
        });
        return;
      }
      await showAlertDialog(this, {
        text:
          err.status_code === 404
            ? this.hass.localize(
                "ui.panel.config.blueprint.editor.load_error_not_editable"
              )
            : this.hass.localize(
                "ui.panel.config.blueprint.editor.load_error_unknown",
                { err_no: err.status_code }
              ),
      });
      history.back();
    }
  }

  private async _confirmUnsavedChanged(): Promise<boolean> {
    if (this._dirty) {
      return showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.blueprint.editor.unsaved_confirm_title"
        ),
        text: this.hass!.localize(
          "ui.panel.config.blueprint.editor.unsaved_confirm_text"
        ),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
        destructive: true,
      });
    }
    return true;
  }

  private _backTapped = async () => {
    const result = await this._confirmUnsavedChanged();
    if (result) {
      afterNextRender(() => history.back());
    }
  };

  private _setEntityId() {
    const blueprint = this.blueprints.find(
      (entity: BlueprintEntity) => entity.attributes.id === this.blueprintId
    );
    this._entityId = blueprint?.entity_id;
  }

  private _inputChanged(
    ev: CustomEvent<{ value: [string, BlueprintInput][] }>
  ) {
    const input = ev.detail.value.reduce(
      (acc, [key, i]) => ({ ...acc, [key]: i }),
      {}
    );
    this._config = {
      ...this._config,
      blueprint: {
        ...this._config?.blueprint,
        input,
      },
    };
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldBlueprintId = changedProps.get("blueprintId");
    if (
      changedProps.has("blueprintId") &&
      this.blueprintId &&
      this.hass &&
      // Only refresh config if we picked a new blueprint. If same ID, don't fetch it.
      oldBlueprintId !== this.blueprintId
    ) {
      this._setEntityId();
      this._loadConfig();
    }

    if (!this.blueprintId && !this._entityId && !this._config && this.hass) {
      const initData = getBlueprintEditorInitData();
      let baseConfig: Partial<BlueprintConfig> = { description: "" };
      if (!initData) {
        baseConfig = {
          ...baseConfig,
          ...this.getDefaultConfig(),
        };
      }
      this._config = {
        ...baseConfig,
        ...(initData ? this.normalizeBlueprintConfig(initData) : initData),
      } as BlueprintConfig;
      this._entityId = undefined;
      this._readOnly = false;
      this._dirty = true;
    }

    if (changedProps.has("blueprints") && this.blueprintId && !this._entityId) {
      this._setEntityId();
    }

    if (changedProps.has("_config")) {
      Object.values(this._configSubscriptions).forEach((sub) =>
        sub(this._config)
      );
    }
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .header=${this._config?.blueprint.name ||
        this.hass.localize("ui.panel.config.blueprint.editor.default_name")}
      >
        ${this.renderHeader()}

        <div class="editor-content">
          <div class="header">
            <h2 id="variables-heading" class="name">
              ${this.hass.localize(
                "ui.panel.config.blueprint.editor.inputs.header"
              )}
            </h2>
            <a
              href=${documentationUrl(this.hass, "/docs/blueprint/variable/")}
              target="_blank"
              rel="noreferrer"
            >
              <ha-icon-button
                .path=${mdiHelpCircle}
                .label=${this.hass.localize(
                  "ui.panel.config.blueprint.editor.inputs.learn_more"
                )}
              ></ha-icon-button>
            </a>
          </div>
          ${!Object.entries(this._config?.blueprint?.input || {})?.length
            ? html`<p class="section-description">
                ${this.hass.localize(
                  "ui.panel.config.blueprint.editor.inputs.section_description"
                )}
              </p>`
            : nothing}

          <ha-blueprint-input
            role="region"
            aria-labelledby="inputs-heading"
            .inputs=${Object.entries(this._config?.blueprint.input || {})}
            @value-changed=${this._inputChanged}
            .hass=${this.hass}
            .disabled=${this._readOnly}
          ></ha-blueprint-input>

          ${this.renderEditor(stateObj)}
        </div>

        <ha-fab
          slot="fab"
          class=${classMap({
            dirty: !this._readOnly && this._dirty,
          })}
          .label=${this.hass.localize("ui.panel.config.blueprint.editor.save")}
          .disabled=${this._saving}
          extended
          @click=${this._saveBlueprint}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  private _updateInputsInHass() {}

  protected disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding-bottom: 20px;
        }
        .yaml-mode {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding-bottom: 0;
        }
        .editor-content,
        :not(.yaml-mode) > ha-alert {
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
          display: block;
        }
        ha-yaml-editor {
          flex-grow: 1;
          --actions-border-radius: 0;
          --code-mirror-height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
        }
        ha-fab {
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
          bottom: 0;
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
        ha-button-menu a {
          text-decoration: none;
          color: var(--primary-color);
        }
        h1 {
          margin: 0;
        }
        .header-name {
          display: flex;
          align-items: center;
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
        }
        :host {
          display: block;
        }
        ha-card {
          overflow: hidden;
        }
        .description {
          margin: 0;
        }
        p {
          margin-top: 0;
        }
        .header {
          margin-top: 16px;

          display: flex;
          align-items: center;
        }
        .header:first-child {
          margin-top: -16px;
        }
        .header .name {
          font-weight: 400;
          flex: 1;
          margin-bottom: 16px;
        }
        .header a {
          color: var(--secondary-text-color);
        }
        .header .small {
          font-size: small;
          font-weight: normal;
          line-height: 0;
        }
        .section-description {
          margin-bottom: 16px;
        }
      `,
    ];
  }
}
