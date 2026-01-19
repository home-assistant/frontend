import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/chips/ha-assist-chip";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/ha-alert";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-domain-icon";

import "../../../../components/ha-icon-picker";
import "../../../../components/ha-labels-picker";
import "../../../../components/ha-suggest-with-ai-button";
import type { SuggestWithAIGenerateTask } from "../../../../components/ha-suggest-with-ai-button";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-textfield";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../category/ha-category-picker";

import type { GenDataTaskResult } from "../../../../data/ai_task";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type {
  EntityRegistryUpdate,
  SceneSaveDialogParams,
} from "./show-dialog-scene-save";
import {
  type MetadataSuggestionInclude,
  type MetadataSuggestionResult,
  generateMetadataSuggestionTask,
  processMetadataSuggestion,
} from "../../common/suggest-metadata-ai";

const SUGGESTION_CONFIG: MetadataSuggestionInclude = {
  description: false,
  categories: true,
  labels: true,
};

@customElement("ha-dialog-scene-save")
class DialogSceneSave extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _error = false;

  @state() private _visibleOptionals: string[] = [];

  @state() private _entryUpdates!: EntityRegistryUpdate;

  private _params!: SceneSaveDialogParams;

  @state() private _newName?: string;

  private _newIcon?: string;

  public showDialog(params: SceneSaveDialogParams): void {
    this._open = true;
    this._params = params;
    this._error = false;
    this._newIcon = params.config.icon;
    this._newName =
      params.config.name ||
      this.hass.localize(
        `ui.panel.config.${this._params.domain}.editor.default_name`
      );
    this._entryUpdates = params.entityRegistryUpdate || {
      area: params.entityRegistryEntry?.area_id || "",
      labels: params.entityRegistryEntry?.labels || [],
      category: params.entityRegistryEntry?.categories?.[params.domain] || "",
    };

    this._visibleOptionals = [
      this._entryUpdates.category ? "category" : "",
      this._entryUpdates.labels.length > 0 ? "labels" : "",
    ].filter(Boolean);
  }

  public closeDialog() {
    this._open = false;
    this._error = false;
  }

  private _dialogClosed() {
    this._open = false;
    this._error = false;
    this._params.onClose?.();
    this._visibleOptionals = [];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected _renderOptionalChip(id: string, label: string) {
    if (this._visibleOptionals.includes(id)) {
      return nothing;
    }

    return html`
      <ha-assist-chip id=${id} @click=${this._addOptional} label=${label}>
        <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
      </ha-assist-chip>
    `;
  }

  protected _renderInputs() {
    if (this._params.hideInputs) {
      return nothing;
    }

    return html`
      <ha-textfield
        dialogInitialFocus
        .value=${this._newName}
        .placeholder=${this.hass.localize(
          `ui.panel.config.${this._params.domain}.editor.default_name`
        )}
        .label=${this.hass.localize("ui.panel.config.scene.editor.name")}
        required
        type="string"
        @input=${this._valueChanged}
      ></ha-textfield>

      <ha-icon-picker
        .hass=${this.hass}
        .label=${this.hass.localize("ui.panel.config.scene.editor.icon")}
        .value=${this._newIcon}
        @value-changed=${this._iconChanged}
      >
        <ha-domain-icon
          slot="start"
          domain=${this._params.domain}
          .hass=${this.hass}
        >
        </ha-domain-icon>
      </ha-icon-picker>

      <ha-area-picker
        id="area"
        .hass=${this.hass}
        .value=${this._entryUpdates.area}
        @value-changed=${this._registryEntryChanged}
      ></ha-area-picker>

      ${this._visibleOptionals.includes("category")
        ? html` <ha-category-picker
            id="category"
            .hass=${this.hass}
            .scope=${this._params.domain}
            .label=${this.hass.localize(
              "ui.components.category-picker.category"
            )}
            .value=${this._entryUpdates.category}
            @value-changed=${this._registryEntryChanged}
          ></ha-category-picker>`
        : nothing}
      ${this._visibleOptionals.includes("labels")
        ? html` <ha-labels-picker
            id="labels"
            .hass=${this.hass}
            .value=${this._entryUpdates.labels}
            @value-changed=${this._registryEntryChanged}
          ></ha-labels-picker>`
        : nothing}

      <ha-chip-set>
        ${this._renderOptionalChip(
          "category",
          this.hass.localize("ui.panel.config.scene.editor.dialog.add_category")
        )}
        ${this._renderOptionalChip(
          "labels",
          this.hass.localize("ui.panel.config.scene.editor.dialog.add_labels")
        )}
      </ha-chip-set>
    `;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const title = this.hass.localize(
      this._params.config.id
        ? "ui.panel.config.scene.editor.rename"
        : "ui.common.save"
    );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this._params.title || title}
        @closed=${this._dialogClosed}
      >
        ${this._params.hideInputs
          ? nothing
          : html` <ha-suggest-with-ai-button
              slot="headerActionItems"
              .hass=${this.hass}
              .generateTask=${this._generateTask}
              @suggestion=${this._handleSuggestion}
            ></ha-suggest-with-ai-button>`}
        ${this._error
          ? html`<ha-alert alert-type="error"
              >${this.hass.localize(
                "ui.panel.config.scene.editor.missing_name"
              )}</ha-alert
            >`
          : ""}
        ${this._params.description
          ? html`<p>${this._params.description}</p>`
          : nothing}
        ${this._renderInputs()}

        <ha-dialog-footer slot="footer">
          ${this._params.onDiscard
            ? html`
                <ha-button
                  slot="secondaryAction"
                  variant="danger"
                  appearance="plain"
                  @click=${this._handleDiscard}
                >
                  ${this.hass.localize("ui.common.dont_save")}
                </ha-button>
              `
            : nothing}
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._save}>
            ${this.hass.localize(
              this._params.config.id && !this._params.onDiscard
                ? "ui.panel.config.scene.editor.rename"
                : "ui.common.save"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _addOptional(ev) {
    ev.stopPropagation();
    const option: string = ev.target.id;
    this._visibleOptionals = [...this._visibleOptionals, option];
  }

  private _registryEntryChanged(ev) {
    ev.stopPropagation();
    const id: string = ev.target.id;
    const value = ev.detail.value;

    this._entryUpdates = { ...this._entryUpdates, [id]: value };
  }

  private _iconChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._newIcon = ev.detail.value || undefined;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._newName = (ev.target as HTMLInputElement).value;
    if (this._error && this._newName.trim()) {
      this._error = false;
    }
  }

  private _handleDiscard() {
    this._params.onDiscard?.();
    this.closeDialog();
  }

  private _generateTask = async (): Promise<SuggestWithAIGenerateTask> =>
    generateMetadataSuggestionTask(
      this.hass.connection,
      this.hass.states,
      this.hass.language,
      "scene",
      this._params.config,
      SUGGESTION_CONFIG
    );

  private async _handleSuggestion(
    event: CustomEvent<GenDataTaskResult<MetadataSuggestionResult>>
  ) {
    const result = event.detail;
    const processed = await processMetadataSuggestion(
      this.hass.connection,
      "scene",
      result,
      SUGGESTION_CONFIG
    );

    this._newName = processed.name;
    if (this._error && this._newName.trim()) {
      this._error = false;
    }

    if (processed.category) {
      this._entryUpdates = {
        ...this._entryUpdates,
        category: processed.category,
      };
      if (!this._visibleOptionals.includes("category")) {
        this._visibleOptionals = [...this._visibleOptionals, "category"];
      }
    }

    if (processed.labels?.length) {
      this._entryUpdates = {
        ...this._entryUpdates,
        labels: processed.labels,
      };
      if (!this._visibleOptionals.includes("labels")) {
        this._visibleOptionals = [...this._visibleOptionals, "labels"];
      }
    }
  }

  private async _save(): Promise<void> {
    if (!this._newName) {
      this._error = true;
      return;
    }

    await this._params.updateConfig(
      {
        ...this._params.config,
        name: this._newName,
        icon: this._newIcon,
      },
      this._entryUpdates
    );

    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-textfield,
        ha-icon-picker,
        ha-category-picker,
        ha-labels-picker,
        ha-area-picker {
          display: block;
        }
        ha-icon-picker,
        ha-category-picker,
        ha-labels-picker,
        ha-area-picker,
        ha-chip-set:has(> ha-assist-chip) {
          margin-top: var(--ha-space-4);
        }
        ha-alert {
          display: block;
          margin-bottom: var(--ha-space-4);
        }

        ha-suggest-with-ai-button {
          margin: var(--ha-space-2) var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-scene-save": DialogSceneSave;
  }
}
