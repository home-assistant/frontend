import type {
  CSSResult,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { css, html, nothing } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { property, query, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
import { goBack, navigate } from "../../../common/navigate";
import { debounce } from "../../../common/util/debounce";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/animation/ha-fade-in";
import "../../../components/ha-alert";
import "../../../components/ha-spinner"; // used by renderLoading() provided to both editors
import type { AutomationMigrationReport } from "../../../data/automation";
import {
  parseConfigSaveError,
  validateConfigErrors,
  type ConfigValidationError,
  type ValidationSectionKeys,
} from "../../../data/config";
import { fireRelatedContext, fullEntitiesContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import type { Constructor, HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import {
  errorsEqual,
  errorsOnKnownItems,
  errorText,
  followErrors,
  followKnownErrorItems,
  knownErrorItems,
  mapErrorsToConfig,
  NO_ERRORS,
  type KnownErrorItem,
} from "./automation-errors";
import type { EntityRegistryUpdate } from "./automation-save-dialog/show-dialog-automation-save";
import { showEditorToast } from "./editor-toast";

const CONFIG_ERRORS_TOAST_ID = "config-errors";

const REVALIDATE_DELAY = 500;

interface ErrorsEditorElement extends HTMLElement {
  revealErrors(): Promise<void>;
}

/** Minimum config shape shared by both AutomationConfig and ScriptConfig. */
interface BaseEditorConfig {
  alias?: string;
}

/** Shared CSS styles for both automation and script editors. */
export const automationScriptEditorStyles: CSSResult = css`
  :host {
    --ha-automation-editor-max-width: var(--ha-automation-editor-width, 1540px);
  }
  ha-fade-in {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }
  .yaml-mode {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding-bottom: 0;
  }
  ha-yaml-editor {
    flex-grow: 1;
    --actions-border-radius: var(--ha-border-radius-square);
    --code-mirror-height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  p {
    margin-bottom: 0;
  }
  .config-errors p {
    margin: 0;
    white-space: pre-wrap;
  }
  ha-button[slot="fab"] {
    position: fixed;
    right: calc(16px + var(--safe-area-inset-right, 0px));
    bottom: calc(-80px - var(--safe-area-inset-bottom));
    transition: bottom 0.3s;
    --ha-button-box-shadow: var(--ha-box-shadow-l);
  }
  ha-button[slot="fab"].dirty {
    bottom: calc(16px + var(--safe-area-inset-bottom, 0px));
  }
  ha-tooltip ha-svg-icon {
    width: 12px;
  }
  ha-tooltip .shortcut {
    direction: ltr;
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    gap: 2px;
  }
`;

export interface EditorDomainHooks<TConfig> {
  fetchFileConfig(hass: HomeAssistant, id: string): Promise<TConfig>;
  normalizeConfig(raw: TConfig, report?: AutomationMigrationReport): TConfig;
  /** The parts of the config `validate_config` checks, none for blueprints. */
  validationSections(
    config: TConfig
  ): Partial<Record<"triggers" | "conditions" | "actions", unknown>>;
  validationSectionKeys?: ValidationSectionKeys;
  domain: "automation" | "script";
}

interface AutomationEditorConfig<TConfig> {
  config: TConfig;
  entityRegistryUpdate?: EntityRegistryUpdate;
}

export const AutomationScriptEditorMixin = <TConfig extends BaseEditorConfig>(
  superClass: Constructor<LitElement>
) => {
  class AutomationScriptEditorClass extends DirtyStateProviderMixin<
    AutomationEditorConfig<TConfig>
  >()(superClass) {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

    @property({ type: Boolean }) public narrow = false;

    @property({ attribute: false }) public route!: Route;

    @property({ attribute: false }) public entityId: string | null = null;

    @state()
    @consume({ context: fullEntitiesContext, subscribe: true })
    entityRegistry?: EntityRegistryEntry[];

    @state() protected yamlErrors?: string;

    @state() protected currentEntityId?: string;

    @state() protected mode: "gui" | "yaml" = "gui";

    @state() protected readOnly = false;

    @state() protected saving = false;

    @state() protected deprecatedConfigMigrated = false;

    @state() protected configErrors: ConfigValidationError[] = NO_ERRORS;

    @state() protected config?: TConfig;

    @state() protected blueprintConfig?: TConfig;

    @state()
    @consume({ context: fullEntitiesContext, subscribe: true })
    @transform<EntityRegistryEntry[], EntityRegistryEntry>({
      transformer: function (this: { currentEntityId?: string }, value) {
        return value?.find(
          ({ entity_id }) => entity_id === this.currentEntityId
        );
      },
      watch: ["currentEntityId"],
    })
    protected registryEntry?: EntityRegistryEntry;

    protected entityRegistryUpdate?: EntityRegistryUpdate;

    protected domainHooks!: EditorDomainHooks<TConfig>;

    protected get dashboardPath(): string {
      return `/config/${this.domainHooks.domain}/dashboard`;
    }

    protected entityRegCreated?: (
      value: PromiseLike<EntityRegistryEntry> | EntityRegistryEntry
    ) => void;

    private _relatedContextAreaId?: string;

    @query("manual-automation-editor, manual-script-editor")
    private _errorsEditor?: ErrorsEditorElement;

    // Validation responses of an older run are dropped
    private _validationRun = 0;

    private _knownErrorItems: KnownErrorItem[] = [];

    protected willUpdate(changedProps: PropertyValues): void {
      super.willUpdate(changedProps);
      if (
        changedProps.has("currentEntityId") ||
        changedProps.has("entityRegistry")
      ) {
        this._setRelatedContext();
      }
    }

    protected updated(changedProps: PropertyValues): void {
      super.updated(changedProps);
      if (changedProps.has("config") && this.configErrors.length) {
        this._knownErrorItems = followKnownErrorItems(
          this._knownErrorItems,
          changedProps.get("config"),
          this.config
        );
        this._revalidate();
      }
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      this._revalidate.cancel();
      if (this.configErrors.length) {
        this._closeErrorsToast();
      }
    }

    /** Shows the errors of saving `submitted`, the config sent to core. */
    protected async showSaveErrors(err: unknown, submitted: TConfig) {
      const { message, errors } = parseConfigSaveError(err);
      if (!errors.length) {
        this._showSaveFailedToast(message);
        return;
      }
      this._validationRun++;
      const submittedErrors = mapErrorsToConfig(submitted, errors);
      // Edits made while saving moved or removed some of the items
      const changed = submitted !== this.config;
      this._setConfigErrors(
        this.config,
        changed
          ? followErrors(submittedErrors, submitted, this.config)
          : submittedErrors
      );
      if (changed) {
        // Followed errors miss items that were renamed and moved, so check
        // everything again
        await this._validateConfig(false);
      }
      this._showSaveFailedToast(
        errors.length === 1
          ? errors[0].message
          : this.hass.localize(
              "ui.panel.config.automation.editor.errors.problems_found",
              { count: errors.length }
            )
      );
      await this._revealErrors();
    }

    protected async checkValidation() {
      if (!this.currentEntityId || !this.config) {
        return;
      }
      if (this.hass.states[this.currentEntityId]?.state !== UNAVAILABLE) {
        return;
      }
      const config = this.config;
      const sections = this.domainHooks.validationSections(config);
      if (!Object.keys(sections).length) {
        return;
      }
      const run = ++this._validationRun;
      let errors: ConfigValidationError[];
      try {
        errors = await validateConfigErrors(
          this.hass,
          sections,
          this.domainHooks.validationSectionKeys
        );
      } catch (_err: unknown) {
        // The unavailable alert still shows, only the rows stay unmarked
        return;
      }
      if (run !== this._validationRun || config !== this.config) {
        return;
      }
      this._setConfigErrors(config, mapErrorsToConfig(config, errors));
    }

    private _setConfigErrors(
      config: TConfig | undefined,
      errors: ConfigValidationError[]
    ) {
      this.configErrors = errors;
      this._knownErrorItems = knownErrorItems(config, errors);
    }

    private async _revealErrors() {
      await this.updateComplete;
      if (this.mode === "gui") {
        await this._errorsEditor?.revealErrors();
      }
    }

    /** All errors, for the editors that have no rows to show them on. */
    protected renderConfigErrorsAlert(slot?: string) {
      return this.configErrors.length
        ? html`<ha-alert
            alert-type="error"
            class="config-errors"
            slot=${ifDefined(slot)}
          >
            ${this.configErrors.map((error) => html`<p>${errorText(error)}</p>`)}
          </ha-alert>`
        : nothing;
    }

    private _showSaveFailedToast(problems: string) {
      showEditorToast(this, {
        id: CONFIG_ERRORS_TOAST_ID,
        message: this.hass.localize(
          "ui.panel.config.automation.editor.errors.save_failed",
          { problems }
        ),
      });
    }

    private _closeErrorsToast() {
      // A removed editor can't reach the toast manager by bubbling
      const host = this.isConnected
        ? this
        : document.querySelector<HTMLElement>("home-assistant");
      if (!host) {
        return;
      }
      showToast(host, {
        id: CONFIG_ERRORS_TOAST_ID,
        message: "",
        duration: 0,
      });
    }

    // Updates the errors of the items that had one, so fixed problems clear
    // while editing. New problems elsewhere, and errors outside the validated
    // sections like an invalid mode, wait for the next save.
    private _revalidate = debounce(() => {
      this._validateConfig(true);
    }, REVALIDATE_DELAY);

    /**
     * Validates the sections of the current config. With `onlyKnown`, only
     * errors on items that already had one are kept.
     */
    private async _validateConfig(onlyKnown: boolean) {
      this._revalidate.cancel();
      const config = this.config;
      if (!config || (onlyKnown && !this.configErrors.length)) {
        return;
      }
      const sections = this.domainHooks.validationSections(config);
      // Blueprint inputs can't be validated on their own, so their errors
      // only last until the next edit
      if (!Object.keys(sections).length) {
        this.clearConfigErrors();
        return;
      }
      const sectionKeys = this.domainHooks.validationSectionKeys ?? {};
      const run = ++this._validationRun;
      let sectionErrors: ConfigValidationError[];
      try {
        sectionErrors = await validateConfigErrors(
          this.hass,
          sections,
          sectionKeys
        );
      } catch (_err: unknown) {
        return;
      }
      if (run !== this._validationRun || config !== this.config) {
        return;
      }
      const mapped = mapErrorsToConfig(config, sectionErrors);
      const validated = Object.keys(sections).map(
        (key) => sectionKeys[key] ?? key
      );
      const errors = [
        ...this.configErrors.filter(
          (error) => !validated.includes(error.path[0] as string)
        ),
        ...(onlyKnown
          ? errorsOnKnownItems(this._knownErrorItems, config, mapped)
          : mapped),
      ];
      if (!errors.length) {
        this.clearConfigErrors();
        return;
      }
      this._setConfigErrors(
        config,
        errorsEqual(errors, this.configErrors) ? this.configErrors : errors
      );
    }

    protected clearConfigErrors() {
      this._validationRun++;
      this._revalidate.cancel();
      if (this.configErrors.length) {
        this.configErrors = NO_ERRORS;
        this._closeErrorsToast();
      }
    }

    private _setRelatedContext(): void {
      const areaId = this.currentEntityId
        ? this.entityRegistry?.find(
            ({ entity_id }) => entity_id === this.currentEntityId
          )?.area_id || undefined
        : undefined;

      if (areaId === this._relatedContextAreaId) {
        return;
      }

      this._relatedContextAreaId = areaId;
      fireRelatedContext(
        this,
        areaId
          ? {
              itemType: "area",
              itemId: areaId,
            }
          : undefined
      );
    }

    protected renderLoading(): TemplateResult {
      return html`
        <ha-fade-in .delay=${500}>
          <ha-spinner size="large"></ha-spinner>
        </ha-fade-in>
      `;
    }

    protected showSettings() {
      showMoreInfoDialog(this, {
        entityId: this.currentEntityId!,
        view: "settings",
      });
    }

    protected async switchUiMode() {
      if (this.yamlErrors) {
        const result = await showConfirmationDialog(this, {
          text: html`${this.hass.localize(
              "ui.panel.config.automation.editor.switch_ui_yaml_error"
            )}<br /><br />${this.yamlErrors}`,
          confirmText: this.hass!.localize("ui.common.continue"),
          destructive: true,
          dismissText: this.hass!.localize("ui.common.cancel"),
        });
        if (!result) {
          return;
        }
      }
      this.yamlErrors = undefined;
      this.mode = "gui";
    }

    protected switchYamlMode() {
      this.mode = "yaml";
    }

    protected takeControlSave() {
      this.readOnly = false;
      // Force dirty: set baseline to null so current config always differs
      this._initDirtyTracking(
        { type: "deep", compareKeyOrder: true },
        {
          config: null as unknown as TConfig,
          entityRegistryUpdate: this.entityRegistryUpdate,
        }
      );
      this._updateDirtyState({
        config: this.config!,
        entityRegistryUpdate: this.entityRegistryUpdate,
      });
      this.blueprintConfig = undefined;
    }

    protected revertBlueprint() {
      this.config = this.blueprintConfig;
      if (this.mode === "yaml") {
        this.renderRoot.querySelector("ha-yaml-editor")?.setValue(this.config);
      }
      this.blueprintConfig = undefined;
      this.readOnly = false;
    }

    protected backTapped = async () => {
      const result = await this.confirmUnsavedChanged();
      if (result) {
        afterNextRender(() => goBack(this.dashboardPath));
      }
    };

    protected async promptDiscardChanges() {
      return this.confirmUnsavedChanged(false);
    }

    /**
     * Asks whether unsaved changes should be discarded.
     * Subclasses must override this to show a confirmation dialog.
     * @param addHistory false while a navigation is already in flight.
     * @returns true to proceed (discard/save changes), false to cancel.
     */
    protected confirmUnsavedChanged(_addHistory = true): Promise<boolean> {
      return Promise.resolve(true);
    }

    protected async loadConfig(id: string) {
      const hooks = this.domainHooks;
      const domain = hooks.domain;
      this.clearConfigErrors();
      try {
        const config = await hooks.fetchFileConfig(this.hass, id);
        if (!this.isConnected) {
          return;
        }
        this.readOnly = false;
        const report: AutomationMigrationReport = { deprecated: false };
        this.config = hooks.normalizeConfig(config, report);
        // The config is loaded as its migrated (clean) version, so it never
        // looks dirty. Surface an alert offering to save when deprecated
        // options were migrated.
        this.deprecatedConfigMigrated = report.deprecated;
        this._initDirtyTracking(
          { type: "deep", compareKeyOrder: true },
          {
            config: this.config,
            entityRegistryUpdate: this.entityRegistryUpdate,
          }
        );
        this.checkValidation();
      } catch (err: any) {
        if (!this.isConnected) {
          return;
        }
        if (err.status_code !== 404) {
          const alertText =
            err.body?.message || err.body || err.error || "Unknown error";
          await showAlertDialog(this, {
            title: this.hass.localize(
              `ui.panel.config.${domain}.editor.load_error_unknown`,
              { err_no: err.status_code ?? "unknown" }
            ),
            text: html`<pre>${alertText}</pre>`,
          });
          goBack(this.dashboardPath);
          return;
        }
        const entity = this.entityRegistry?.find(
          (ent) => ent.platform === domain && ent.unique_id === id
        );
        if (entity) {
          navigate(`/config/${domain}/show/${entity.entity_id}`, {
            replace: true,
          });
          return;
        }
        await showAlertDialog(this, {
          text: this.hass.localize(
            `ui.panel.config.${domain}.editor.load_error_not_editable`
          ),
        });
        goBack(this.dashboardPath);
      }
    }
  }
  return AutomationScriptEditorClass;
};
