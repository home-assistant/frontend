import { consume } from "@lit/context";
import type { CSSResult, TemplateResult, LitElement } from "lit";
import { css, html } from "lit";
import { property, state } from "lit/decorators";
import { transform } from "../../../common/decorators/transform";
import { goBack, navigate } from "../../../common/navigate";
import { afterNextRender } from "../../../common/util/render-status";
import { fullEntitiesContext } from "../../../data/context";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import type { Constructor, HomeAssistant, Route } from "../../../types";
import type { EntityRegistryUpdate } from "./automation-save-dialog/show-dialog-automation-save";
import "../../../components/ha-fade-in";
import "../../../components/ha-spinner"; // used by renderLoading() provided to both editors

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
  ha-fab {
    position: fixed;
    right: calc(16px + var(--safe-area-inset-right, 0px));
    bottom: calc(-80px - var(--safe-area-inset-bottom));
    transition: bottom 0.3s;
  }
  ha-fab.dirty {
    bottom: calc(16px + var(--safe-area-inset-bottom, 0px));
  }
  ha-tooltip ha-svg-icon {
    width: 12px;
  }
  ha-tooltip .shortcut {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    gap: 2px;
  }
`;

export interface EditorDomainHooks<TConfig> {
  fetchFileConfig(hass: HomeAssistant, id: string): Promise<TConfig>;
  normalizeConfig(raw: TConfig): TConfig;
  checkValidation(): Promise<void>;
  domain: "automation" | "script";
}

export const AutomationScriptEditorMixin = <TConfig extends BaseEditorConfig>(
  superClass: Constructor<LitElement>
) => {
  class AutomationScriptEditorClass extends superClass {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

    @property({ type: Boolean }) public narrow = false;

    @property({ attribute: false }) public route!: Route;

    @property({ attribute: false }) public entityId: string | null = null;

    @state()
    @consume({ context: fullEntitiesContext, subscribe: true })
    entityRegistry!: EntityRegistryEntry[];

    @state() protected dirty = false;

    @state() protected errors?: string;

    @state() protected yamlErrors?: string;

    @state() protected currentEntityId?: string;

    @state() protected mode: "gui" | "yaml" = "gui";

    @state() protected readOnly = false;

    @state() protected saving = false;

    @state() protected validationErrors?: (string | TemplateResult)[];

    @state() protected config?: TConfig;

    @state() protected blueprintConfig?: TConfig;

    @state()
    @consume({ context: fullEntitiesContext, subscribe: true })
    @transform<EntityRegistryEntry[], EntityRegistryEntry>({
      transformer: function (this: { currentEntityId?: string }, value) {
        return value.find(
          ({ entity_id }) => entity_id === this.currentEntityId
        );
      },
      watch: ["currentEntityId"],
    })
    protected registryEntry?: EntityRegistryEntry;

    protected entityRegistryUpdate?: EntityRegistryUpdate;

    protected domainHooks!: EditorDomainHooks<TConfig>;

    protected entityRegCreated?: (
      value: PromiseLike<EntityRegistryEntry> | EntityRegistryEntry
    ) => void;

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
      this.dirty = true;
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
        afterNextRender(() => goBack("/config"));
      }
    };

    protected get isDirty() {
      return this.dirty;
    }

    protected async promptDiscardChanges() {
      return this.confirmUnsavedChanged();
    }

    /**
     * Asks whether unsaved changes should be discarded.
     * Subclasses must override this to show a confirmation dialog.
     * @returns true to proceed (discard/save changes), false to cancel.
     */
    protected confirmUnsavedChanged(): Promise<boolean> {
      return Promise.resolve(true);
    }

    protected async loadConfig(id: string) {
      const hooks = this.domainHooks;
      const domain = hooks.domain;
      try {
        const config = await hooks.fetchFileConfig(this.hass, id);
        this.dirty = false;
        this.readOnly = false;
        this.config = hooks.normalizeConfig(config);
        hooks.checkValidation();
      } catch (err: any) {
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
          goBack("/config");
          return;
        }
        const entity = this.entityRegistry.find(
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
        goBack("/config");
      }
    }
  }
  return AutomationScriptEditorClass;
};
