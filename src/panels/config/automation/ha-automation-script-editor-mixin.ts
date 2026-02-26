import { consume } from "@lit/context";
import type { CSSResult, TemplateResult, LitElement } from "lit";
import { css, html } from "lit";
import { property, state } from "lit/decorators";
import { transform } from "../../../common/decorators/transform";
import { goBack } from "../../../common/navigate";
import { afterNextRender } from "../../../common/util/render-status";
import { fullEntitiesContext } from "../../../data/context";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import type { Constructor, HomeAssistant, Route } from "../../../types";
import type { EntityRegistryUpdate } from "./automation-save-dialog/show-dialog-automation-save";
import "../../../components/ha-fade-in";
import "../../../components/ha-spinner"; // used by _renderLoading() provided to both editors

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

export const AutomationScriptEditorMixin = <TConfig extends BaseEditorConfig>(
  superClass: Constructor<LitElement>
) => {
  class AutomationScriptEditorClass extends superClass {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

    @property({ type: Boolean }) public narrow = false;

    @property({ attribute: false }) public route!: Route;

    @property({ attribute: false }) public entityId: string | null = null;

    @state() protected _dirty = false;

    @state() protected _errors?: string;

    @state() protected _yamlErrors?: string;

    @state() protected _entityId?: string;

    @state() protected _mode: "gui" | "yaml" = "gui";

    @state() protected _readOnly = false;

    @state() protected _saving = false;

    @state() protected _validationErrors?: (string | TemplateResult)[];

    @state() protected _config?: TConfig;

    @state() protected _blueprintConfig?: TConfig;

    @state()
    @consume({ context: fullEntitiesContext, subscribe: true })
    @transform<EntityRegistryEntry[], EntityRegistryEntry>({
      transformer: function (this: { _entityId?: string }, value) {
        return value.find(({ entity_id }) => entity_id === this._entityId);
      },
      watch: ["_entityId"],
    })
    protected _registryEntry?: EntityRegistryEntry;

    protected _entityRegistryUpdate?: EntityRegistryUpdate;

    protected _entityRegCreated?: (
      value: PromiseLike<EntityRegistryEntry> | EntityRegistryEntry
    ) => void;

    protected _renderLoading(): TemplateResult {
      return html`
        <ha-fade-in .delay=${500}>
          <ha-spinner size="large"></ha-spinner>
        </ha-fade-in>
      `;
    }

    protected _showSettings() {
      showMoreInfoDialog(this, {
        entityId: this._entityId!,
        view: "settings",
      });
    }

    protected async _switchUiMode() {
      if (this._yamlErrors) {
        const result = await showConfirmationDialog(this, {
          text: html`${this.hass.localize(
              "ui.panel.config.automation.editor.switch_ui_yaml_error"
            )}<br /><br />${this._yamlErrors}`,
          confirmText: this.hass!.localize("ui.common.continue"),
          destructive: true,
          dismissText: this.hass!.localize("ui.common.cancel"),
        });
        if (!result) {
          return;
        }
      }
      this._yamlErrors = undefined;
      this._mode = "gui";
    }

    protected _switchYamlMode() {
      this._mode = "yaml";
    }

    protected _takeControlSave() {
      this._readOnly = false;
      this._dirty = true;
      this._blueprintConfig = undefined;
    }

    protected _revertBlueprint() {
      this._config = this._blueprintConfig;
      if (this._mode === "yaml") {
        this.renderRoot.querySelector("ha-yaml-editor")?.setValue(this._config);
      }
      this._blueprintConfig = undefined;
      this._readOnly = false;
    }

    protected _backTapped = async () => {
      const result = await this._confirmUnsavedChanged();
      if (result) {
        afterNextRender(() => goBack("/config"));
      }
    };

    protected get isDirty() {
      return this._dirty;
    }

    protected async promptDiscardChanges() {
      return this._confirmUnsavedChanged();
    }

    /**
     * Asks whether unsaved changes should be discarded.
     * Subclasses must override this to show a confirmation dialog.
     * @returns true to proceed (discard/save changes), false to cancel.
     */
    protected _confirmUnsavedChanged(): Promise<boolean> {
      return Promise.resolve(true);
    }
  }
  return AutomationScriptEditorClass;
};
