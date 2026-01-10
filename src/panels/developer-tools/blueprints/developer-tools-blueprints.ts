import type { CSSResultGroup } from "lit";
import { css, LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiContentSave } from "@mdi/js";
import "../../../components/ha-yaml-editor";
import "../../../components/ha-textfield";
import "../../../components/ha-button";
import "../../../components/ha-card";
import { dump } from "js-yaml";
import type { HomeAssistant } from "../../../types";
import { haStyle } from "../../../resources/styles";
import type {
  Blueprint,
  BlueprintDomain,
  BlueprintMetaDataEditorSchema,
  BlueprintOrError,
  Blueprints,
} from "../../../data/blueprint";
import {
  saveBlueprint,
  fetchBlueprints,
  BlueprintYamlSchema,
} from "../../../data/blueprint";
import "./ha-blueprint-editor";
import "./blueprint-metadata-editor";
import { showPickBlueprintDialog } from "./pick-blueprint-dialog/show-dialog-pick-blueprint";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { manualEditorStyles } from "../../config/automation/styles";

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

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.hass.loadFragmentTranslation("config");
    this._getBlueprints();
    this.addEventListener("reload-blueprints", () => {
      this._getBlueprints();
    });
  }

  private async _getBlueprints() {
    const [automation, script] = await Promise.all([
      fetchBlueprints(this.hass, "automation"),
      fetchBlueprints(this.hass, "script"),
    ]);
    this._blueprints = { automation, script };
  }

  private _onBlueprintContentChanged(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();

    if (!this._selectedBlueprint || "error" in this._selectedBlueprint) {
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

  private _onBlueprintInit(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();

    if (!this._selectedBlueprint || "error" in this._selectedBlueprint) {
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
    this._dirty = false;
  }

  private _onBlueprintMetadataChanged(
    ev: CustomEvent<{ value: BlueprintMetaDataEditorSchema }>
  ) {
    ev.stopPropagation();
    if (!this._selectedBlueprint || "error" in this._selectedBlueprint) {
      return;
    }

    this._selectedBlueprint = {
      ...this._selectedBlueprint,
      metadata: {
        ...this._selectedBlueprint.metadata,
        domain: this._selectedBlueprintDomain!,
        name: ev.detail.value.name,
        author: ev.detail.value.author,
        description: ev.detail.value.description,
        homeassistant: {
          min_version: ev.detail.value.minimum_version,
        },
      },
      blueprint: {
        ...this._selectedBlueprint.metadata,
        domain: this._selectedBlueprintDomain!,
        name: ev.detail.value.name,
        author: ev.detail.value.author,
        description: ev.detail.value.description,
        homeassistant: {
          min_version: ev.detail.value.minimum_version,
        },
      },
    };

    this._selectedBlueprintPath = ev.detail.value.path;
    this._dirty = true;
  }

  private _handleBlueprintPicked(domain: BlueprintDomain, id: string) {
    if (!this._blueprints) {
      return;
    }

    const allBlueprints = [
      ...Object.entries(this._blueprints.script),
      ...Object.entries(this._blueprints.automation),
    ];
    const entry = allBlueprints.find(([blueprintId]) => blueprintId === id);
    if (entry) {
      this._dirty = false;
      this._originalBlueprint = entry[1];
      this._selectedBlueprint = entry[1];
      this._selectedBlueprintPath = id;
      this._originalBlueprintPath = id;
      this._selectedBlueprintDomain = domain;
    }
  }

  private _handleNewBlueprintPicked(domain: BlueprintDomain) {
    const editorElement = customElements.get(
      `ha-blueprint-${domain}-editor`
    ) as CustomElementConstructor & {
      defaultConfig: Blueprint;
    };

    this._dirty = false;
    this._selectedBlueprintDomain = domain;
    this._originalBlueprint = editorElement.defaultConfig;
    this._selectedBlueprint = editorElement.defaultConfig;
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

    if (!this._selectedBlueprint || "error" in this._selectedBlueprint) {
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

  protected render() {
    if (!this._blueprints) {
      return nothing;
    }

    const blueprints = Object.values(this._blueprints)
      .flatMap((b) => Object.values(b))
      .filter((b) => !("error" in b)) as Blueprint[];
    const blueprintMetadata =
      !this._selectedBlueprint || "error" in this._selectedBlueprint
        ? ({
            name: "",
            description: "",
            minimum_version: "",
            path: "",
            author: "",
          } as BlueprintMetaDataEditorSchema)
        : ({
            name: this._selectedBlueprint.metadata.name,
            description: this._selectedBlueprint.metadata.description,
            minimum_version:
              this._selectedBlueprint.metadata.homeassistant?.min_version,
            path: this._selectedBlueprintPath,
            author: this._selectedBlueprint.metadata.author,
          } as BlueprintMetaDataEditorSchema);

    return html`
      <div class="container">
        <div class="full-row">
          <ha-button @click=${this._pickBlueprint}>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.blueprints.editor.actions.pick"
            )}
          </ha-button>
        </div>
        <ha-card class="has-sidebar">
          ${!this._selectedBlueprint
            ? html`
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.blueprints.editor.none_selected"
                )}
              `
            : "error" in this._selectedBlueprint
              ? html`
                  ${this.hass.localize(
                    "ui.panel.developer-tools.tabs.blueprints.editor.error"
                  )}
                `
              : html`
                  <div class="content-wrapper">
                    <blueprint-metadata-editor
                      .hass=${this.hass}
                      .metadata=${blueprintMetadata}
                      @value-changed=${this._onBlueprintMetadataChanged}
                    ></blueprint-metadata-editor>
                  </div>
                  <ha-blueprint-editor
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .isWide=${!this.narrow}
                    .blueprints=${blueprints}
                    .blueprintPath=${this._originalBlueprintPath}
                    .domain=${this._selectedBlueprint.blueprint?.domain ??
                    this._selectedBlueprint.metadata.domain ??
                    ""}
                    .dirty=${this._dirty}
                    @value-changed=${this._onBlueprintContentChanged}
                    @value-init=${this._onBlueprintInit}
                    @reset=${this._resetBlueprint}
                    @resize-sidebar=${this._resizeSidebar}
                  >
                  </ha-blueprint-editor>
                `}
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
      css`
        :host {
          --ha-automation-editor-max-width: var(
            --ha-automation-editor-width,
            1540px
          );
          --hass-subpage-bottom-inset: 0px;
        }

        .container {
          margin: 16px;
          gap: 16px;
          display: flex;
          flex-direction: column;
        }

        ha-card {
          padding: 8px;
        }

        .full-row {
          flex: 1 0 100%;
        }
        ha-fab {
          position: fixed;
          bottom: calc(-80px - var(--safe-area-inset-bottom));
          right: calc(24px + var(--safe-area-inset-right));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
          bottom: calc(24px + var(--safe-area-inset-bottom));
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
