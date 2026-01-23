import type { CSSResultGroup } from "lit";
import { css, LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiContentSave } from "@mdi/js";
import "../../../components/ha-yaml-editor";
import "../../../components/ha-textfield";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import yaml, { dump } from "js-yaml";
import { classMap } from "lit/directives/class-map";
import type { HomeAssistant } from "../../../types";
import { haStyle } from "../../../resources/styles";
import type {
  Blueprint,
  BlueprintDomain,
  BlueprintOrError,
  Blueprints,
} from "../../../data/blueprint";
import { showPickBlueprintDialog } from "./pick-blueprint-dialog/show-dialog-pick-blueprint";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import {
  manualEditorStyles,
  saveFabStyles,
} from "../../config/automation/styles";
import type { BlueprintInputSidebarConfig } from "../../../data/automation";
import {
  DefaultAutomationBlueprint,
  DefaultScriptBlueprint,
  getBlueprint,
  normalizeBlueprint,
  saveBlueprint,
  fetchBlueprints,
  isValidBlueprint,
  BlueprintYamlSchema,
} from "../../../data/blueprint";
import "./ha-blueprint-editor";
import "./blueprint-metadata-editor";

// TODO: the problem is that there is a left padding in both the blueprint
//       editor and the automation/script editor, so the sidebar position is
//       all jank.

@customElement("developer-tools-blueprints")
class HaPanelDevBlueprints extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() public _blueprints?: Record<BlueprintDomain, Blueprints>;

  @state() private _selectedBlueprint?: BlueprintOrError;

  @state() private _selectedBlueprintDomain?: BlueprintDomain;

  @state() private _dirty = false;

  @state() public _originalBlueprint?: BlueprintOrError;

  @state() private _selectedBlueprintPath?: string;

  @state() private _originalBlueprintPath?: string;

  @state() private _sidebarConfig?: BlueprintInputSidebarConfig;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.hass.loadFragmentTranslation("config");
    this._getBlueprints();
    this.addEventListener("reload-blueprints", () => {
      this._getBlueprints();
    });
  }

  private async _loadBlueprint(domain: BlueprintDomain, path: string) {
    try {
      const blueprintGetResult = await getBlueprint(this.hass, domain, path);
      const blueprint = yaml.load(blueprintGetResult.yaml, {
        schema: BlueprintYamlSchema,
      }) as Blueprint;
      return normalizeBlueprint(blueprint);
    } catch (err: any) {
      await showAlertDialog(this, {
        text:
          err.status_code === 404
            ? this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.load_error_not_editable"
              )
            : this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.load_error_unknown",
                { err_no: err.status_code }
              ),
      });
      return null;
    }
  }

  private async _getBlueprints() {
    try {
      const [automation, script] = await Promise.all([
        fetchBlueprints(this.hass, "automation"),
        fetchBlueprints(this.hass, "script"),
      ]);
      this._blueprints = { automation, script };
    } catch {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.load_blueprints_error_title"
        ),
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.load_blueprints_error_text"
        ),
      });
    }
  }

  private _onBlueprintContentChanged(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();
    if (
      !this._selectedBlueprint ||
      !isValidBlueprint(this._selectedBlueprint)
    ) {
      this._selectedBlueprint = ev.detail.value;
    } else {
      this._selectedBlueprint = {
        ...this._selectedBlueprint,
        ...ev.detail.value,
        metadata: {
          ...this._selectedBlueprint.metadata,
          input: ev.detail.value.metadata.input,
        },
        blueprint: {
          ...this._selectedBlueprint.metadata,
          input: ev.detail.value.metadata.input,
        },
      };
    }

    this._dirty = true;
  }

  private async _handleBlueprintPicked(domain: BlueprintDomain, id: string) {
    const blueprint = await this._loadBlueprint(domain, id);
    if (!blueprint) {
      return;
    }

    this._dirty = false;
    this._originalBlueprint = blueprint;
    this._selectedBlueprint = blueprint;
    this._selectedBlueprintPath = id;
    this._originalBlueprintPath = id;
    this._selectedBlueprintDomain = domain;
  }

  private _handleNewBlueprintPicked(domain: BlueprintDomain) {
    this._dirty = false;
    this._selectedBlueprintDomain = domain;
    this._originalBlueprint =
      domain === "automation"
        ? DefaultAutomationBlueprint
        : DefaultScriptBlueprint;
    this._selectedBlueprint =
      domain === "automation"
        ? DefaultAutomationBlueprint
        : DefaultScriptBlueprint;
    this._originalBlueprintPath = "";
    this._selectedBlueprintPath = "";
  }

  private async _pickBlueprint() {
    if (!this._blueprints) {
      return;
    }

    if (this._dirty) {
      const shouldContinue = await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.abandon_changes_title"
        ),
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.abandon_changes_text"
        ),
        confirmText: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.abandon_changes_confirm_text"
        ),
        destructive: true,
      });
      if (!shouldContinue) {
        return;
      }
    }

    showPickBlueprintDialog(this, {
      blueprints: this._blueprints,
      handlePickBlueprint: this._handleBlueprintPicked.bind(this),
      handlePickNewBlueprint: this._handleNewBlueprintPicked.bind(this),
    });
  }

  private async _saveBlueprint() {
    if (!this._selectedBlueprintPath || !this._selectedBlueprintDomain) {
      // This shouldn't be possible!
      return;
    }

    if (
      !this._selectedBlueprint ||
      !isValidBlueprint(this._selectedBlueprint)
    ) {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.error"
        ),
        text: this._selectedBlueprint?.error,
      });
      return;
    }

    if (this._selectedBlueprint.metadata.source_url) {
      const shouldSave = await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.overwrite_existing_title"
        ),
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.overwrite_existing_text"
        ),
      });
      if (!shouldSave) {
        return;
      }
    }

    try {
      await saveBlueprint(
        this.hass,
        this._selectedBlueprintDomain,
        this._selectedBlueprintPath,
        dump(this._selectedBlueprint),
        this._selectedBlueprint.metadata.source_url,
        true
      );
      this._originalBlueprint = this._selectedBlueprint;
      this._originalBlueprintPath = this._selectedBlueprintPath;
      this._dirty = false;
    } catch {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.save_error_title"
        ),
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.save_error_text"
        ),
      });
    }
  }

  private _resetBlueprint(e: Event) {
    e.stopPropagation();

    if (!this._originalBlueprint) {
      return;
    }

    this._selectedBlueprintPath = this._originalBlueprintPath;
    this._selectedBlueprint = { ...this._originalBlueprint };
    this._dirty = false;
  }

  private _resizeSidebar(ev: CustomEvent<string>) {
    this.style.setProperty("--sidebar-dynamic-width", ev.detail);
  }

  private async _openSidebar(ev: CustomEvent<BlueprintInputSidebarConfig>) {
    this._sidebarConfig = ev.detail;
  }

  private async _closeSidebar() {
    this._sidebarConfig = undefined;
  }

  private _renderContent() {
    if (!this._selectedBlueprint || !this._originalBlueprintPath) {
      return html`
        ${this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.none_selected"
        )}
      `;
    }

    if (!isValidBlueprint(this._selectedBlueprint)) {
      return html`
        ${this.hass.localize(
          "ui.panel.developer-tools.tabs.blueprints.editor.error"
        )}
      `;
    }

    return html`
      <ha-blueprint-editor
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${!this.narrow}
        .blueprint=${this._selectedBlueprint}
        .blueprintPath=${this._originalBlueprintPath}
        .domain=${this._selectedBlueprintDomain}
        .dirty=${this._dirty}
        @value-changed=${this._onBlueprintContentChanged}
        @reset=${this._resetBlueprint}
        @resize-sidebar=${this._resizeSidebar}
        @open-sidebar=${this._openSidebar}
        @close-sidebar=${this._closeSidebar}
      >
      </ha-blueprint-editor>
    `;
  }

  protected render() {
    return html`
      <div class="container">
        <div class="full-row">
          <ha-button @click=${this._pickBlueprint}>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.blueprints.editor.actions.pick"
            )}
          </ha-button>
        </div>
        <ha-card
          class=${classMap({
            "has-sidebar": this._sidebarConfig && !this.narrow,
          })}
        >
          ${this._renderContent()}
        </ha-card>
        <ha-yaml-editor
          .hass=${this.hass}
          .yamlSchema=${BlueprintYamlSchema}
          .value=${this._selectedBlueprint}
          .autoUpdate=${true}
          .readOnly=${true}
        >
        </ha-yaml-editor>
      </div>

      <ha-fab
        slot="fab"
        .label=${this.hass.localize("ui.common.save")}
        class=${this._dirty ? "dirty" : ""}
        extended
        @click=${this._saveBlueprint}
      >
        <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
      </ha-fab>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      manualEditorStyles,
      saveFabStyles,
      css`
        :host {
          --safe-area-inset-top: 52.4px;
          --sidebar-width: 0;
          --ha-automation-editor-max-width: var(
            --ha-automation-editor-width,
            1540px
          );
          --hass-subpage-bottom-inset: 0px;
        }

        .container {
          margin: var(--ha-space-4);
          gap: var(--ha-space-4);
          display: flex;
          flex-direction: column;
        }

        ha-card {
          padding: var(--ha-space-2);
        }

        .full-row {
          flex: 1 0 100%;
        }

        ha-fab {
          position: fixed;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-blueprints": HaPanelDevBlueprints;
  }
}
