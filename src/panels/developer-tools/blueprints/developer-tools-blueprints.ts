import type { CSSResultGroup} from "lit";
import { css, LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-yaml-editor";
import "../../../components/ha-textfield";
import "../../../components/ha-button";
import "../../../components/ha-card";
import { dump } from "js-yaml";
import type { HomeAssistant } from "../../../types";
import { haStyle } from "../../../resources/styles";
import type { Blueprint, BlueprintDomain, BlueprintOrError, Blueprints} from "../../../data/blueprint";
import { saveBlueprint, fetchBlueprints, BlueprintYamlSchema } from "../../../data/blueprint";
import "./ha-blueprint-editor";
import "./blueprint-metadata-editor";
import { showPickBlueprintDialog } from "./pick-blueprint-dialog/show-dialog-pick-blueprint";

@customElement("developer-tools-blueprints")
class HaPanelDevBlueprints extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() public _blueprints?: Record<BlueprintDomain, Blueprints>;

  @state() private _selectedBlueprint?: BlueprintOrError;

  @state() private _dirty = false;

  @state() public _originalBlueprint?: BlueprintOrError;

  @state() private _selectedBlueprintPath?: string;

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
    this._selectedBlueprint = { ...this._selectedBlueprint, ...ev.detail.value };
    this._dirty = true;
  }

  private _onBlueprintMetadataChanged(ev: CustomEvent<{ value: Blueprint["metadata"] }>) {
    ev.stopPropagation();
    this._selectedBlueprint = { ...this._selectedBlueprint!, metadata: ev.detail.value };
    this._dirty = true;
  }

  private _onBlueprintYamlChanged(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();
    this._selectedBlueprint = ev.detail.value;
    this._dirty = true;
  }

  private _handleBlueprintPicked(id: string) {
    if (!this._blueprints) {
      return;
    }

    const allBlueprints = [
      ...Object.entries(this._blueprints.script),
      ...Object.entries(this._blueprints.automation)
    ];
    const entry = allBlueprints.find(([blueprintId]) => blueprintId === id)
    if (entry) {
      this._dirty = false;
      this._originalBlueprint = entry[1];
      this._selectedBlueprint = entry[1];
      this._selectedBlueprintPath = id;
    }
  }

  private _handleNewBlueprintPicked(domain: BlueprintDomain) {
    const editorElement = customElements.get(
      `ha-blueprint-${domain}-editor`
    ) as CustomElementConstructor & {
      defaultConfig: Blueprint;
    };

    this._dirty = false;
    this._originalBlueprint = editorElement.defaultConfig;
    this._selectedBlueprint = editorElement.defaultConfig;
  }

  private _pickBlueprint() {
    if (!this._blueprints) {
      return;
    }

    showPickBlueprintDialog(this, {
      blueprints: this._blueprints,
      handlePickBlueprint: this._handleBlueprintPicked.bind(this),
      handlePickNewBlueprint: this._handleNewBlueprintPicked.bind(this),
    });
  }

  private async _saveBlueprint() {
    if (!this._selectedBlueprintPath) {
      // TODO
      return;
    }

    if (!this._selectedBlueprint || ("error" in this._selectedBlueprint)) {
      // TODO
      return;
    }

    await saveBlueprint(
      this.hass,
      this._selectedBlueprint.metadata.domain,
      this._selectedBlueprintPath,
      dump(this._selectedBlueprint),
      "", // TODO display warning
      true // TODO?
    )
  }

  private _resetBlueprint() {
    if (!this._originalBlueprint) {
      return;
    }

    this._selectedBlueprint = { ...this._originalBlueprint };
    this._dirty = false;
  }

  protected render() {
    if (!this._blueprints) {
      return nothing;
    }

    const blueprints = Object
      .values(this._blueprints)
      .flatMap(b => Object.values(b))
      .filter(b => !("error" in b)) as Blueprint[];
    return html`
      <div class="container">
        <div class="full-row">
          <ha-button @click=${this._pickBlueprint}>
            ${this.hass.localize("ui.panel.developer-tools.tabs.blueprints.editor.actions.pick")}
          </ha-button>
          <ha-button @click=${this._saveBlueprint} .disabled=${!this._dirty}>
            ${this.hass.localize("ui.panel.developer-tools.tabs.blueprints.editor.actions.save")}
          </ha-button>
          <ha-button @click=${this._resetBlueprint} .disabled=${!this._dirty}>
            ${this.hass.localize("ui.panel.developer-tools.tabs.blueprints.editor.actions.reset")}
          </ha-button>
        </div>
        <ha-card>
          ${!this._selectedBlueprint 
            ? html`
              ${this.hass.localize("ui.panel.developer-tools.tabs.blueprints.editor.none_selected")}
            `
            : "error" in this._selectedBlueprint
              ? html`
                ${this.hass.localize("ui.panel.developer-tools.tabs.blueprints.editor.error")}
              `
              : html`
                <blueprint-metadata-editor
                  .hass=${this.hass}
                  .metadata=${this._selectedBlueprint.metadata}
                  @value-changed=${this._onBlueprintMetadataChanged}
                ></blueprint-metadata-editor>
                <ha-blueprint-editor
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                  .isWide=${!this.narrow}
                  .blueprints=${blueprints}
                  .blueprintPath=${this._selectedBlueprintPath ?? ""}
                  .domain=${this._selectedBlueprint.metadata.domain}
                  @value-changed=${this._onBlueprintContentChanged}
                >
                </ha-blueprint-editor>
              `}
        </ha-card>
        <ha-yaml-editor
          .yamlSchema=${BlueprintYamlSchema}
          .value=${this._selectedBlueprint}
          .autoUpdate=${true}
          .readOnly=${!this._selectedBlueprintPath}
          @value-changed=${this._onBlueprintYamlChanged}
        >
        </ha-yaml-editor>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-blueprints": HaPanelDevBlueprints;
  }
}
