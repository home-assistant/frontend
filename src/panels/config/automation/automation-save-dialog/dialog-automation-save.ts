import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/chips/ha-assist-chip";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/ha-alert";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-domain-icon";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-labels-picker";
import "../../../../components/ha-suggest-with-ai-button";
import type { SuggestWithAIGenerateTask } from "../../../../components/ha-suggest-with-ai-button";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-textarea";
import "../../../../components/ha-textfield";
import "../../../../components/ha-wa-dialog";
import "../../category/ha-category-picker";

import { supportsMarkdownHelper } from "../../../../common/translations/markdown_support";
import type { GenDataTaskResult } from "../../../../data/ai_task";
import type { AutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type {
  EntityRegistryUpdate,
  SaveDialogParams,
} from "./show-dialog-automation-save";
import {
  type MetadataSuggestionResult,
  SUGGESTION_INCLUDE_ALL,
  generateMetadataSuggestionTask,
  processMetadataSuggestion,
} from "../../common/suggest-metadata-ai";

@customElement("ha-dialog-automation-save")
class DialogAutomationSave extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _error?: string;

  @state() private _visibleOptionals: string[] = [];

  @state() private _entryUpdates!: EntityRegistryUpdate;

  @state() private _params?: SaveDialogParams;

  @state() private _newName?: string;

  private _newIcon?: string;

  private _newDescription?: string;

  public showDialog(params: SaveDialogParams): void {
    this._open = true;
    this._params = params;
    this._newIcon = "icon" in params.config ? params.config.icon : undefined;
    this._newName =
      params.config.alias ||
      this.hass.localize(
        `ui.panel.config.${this._params.domain}.editor.default_name`
      );
    this._newDescription = params.config.description || "";
    this._entryUpdates = params.entityRegistryUpdate || {
      area: params.entityRegistryEntry?.area_id || "",
      labels: params.entityRegistryEntry?.labels || [],
      category: params.entityRegistryEntry?.categories[params.domain] || "",
    };

    this._visibleOptionals = [
      this._newDescription ? "description" : "",
      this._newIcon ? "icon" : "",
      this._entryUpdates.category ? "category" : "",
      this._entryUpdates.labels.length > 0 ? "labels" : "",
      this._entryUpdates.area ? "area" : "",
    ].filter(Boolean);
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._params?.onClose();
    this._visibleOptionals = [];
    this._params = undefined;
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

  protected _renderDiscard() {
    if (!this._params?.onDiscard) {
      return nothing;
    }
    return html`
      <ha-button
        slot="secondaryAction"
        appearance="plain"
        variant="danger"
        @click=${this._handleDiscard}
      >
        ${this.hass.localize("ui.common.dont_save")}
      </ha-button>
    `;
  }

  protected _renderInputs() {
    if (!this._params || this._params.hideInputs) {
      return nothing;
    }

    return html`
      <ha-textfield
        autofocus
        .value=${this._newName}
        .placeholder=${this.hass.localize(
          `ui.panel.config.${this._params.domain}.editor.default_name`
        )}
        .label=${this.hass.localize("ui.panel.config.automation.editor.alias")}
        required
        type="string"
        @input=${this._valueChanged}
      ></ha-textfield>

      ${this._params.domain === "script" &&
      this._visibleOptionals.includes("icon")
        ? html`
            <ha-icon-picker
              .hass=${this.hass}
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.icon"
              )}
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
          `
        : nothing}
      ${this._visibleOptionals.includes("description")
        ? html`<ha-textarea
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.description.label"
            )}
            .placeholder=${this.hass.localize(
              "ui.panel.config.automation.editor.description.placeholder"
            )}
            name="description"
            autogrow
            .value=${this._newDescription}
            .helper=${supportsMarkdownHelper(this.hass.localize)}
            helperPersistent
            @input=${this._valueChanged}
          ></ha-textarea>`
        : nothing}
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
      ${this._visibleOptionals.includes("area")
        ? html` <ha-area-picker
            id="area"
            .hass=${this.hass}
            .value=${this._entryUpdates.area}
            @value-changed=${this._registryEntryChanged}
          ></ha-area-picker>`
        : nothing}

      <ha-chip-set>
        ${this._renderOptionalChip(
          "description",
          this.hass.localize(
            "ui.panel.config.automation.editor.dialog.add_description"
          )
        )}
        ${this._params.domain === "script"
          ? this._renderOptionalChip(
              "icon",
              this.hass.localize(
                "ui.panel.config.automation.editor.dialog.add_icon"
              )
            )
          : nothing}
        ${this._renderOptionalChip(
          "area",
          this.hass.localize(
            "ui.panel.config.automation.editor.dialog.add_area"
          )
        )}
        ${this._renderOptionalChip(
          "category",
          this.hass.localize(
            "ui.panel.config.automation.editor.dialog.add_category"
          )
        )}
        ${this._renderOptionalChip(
          "labels",
          this.hass.localize(
            "ui.panel.config.automation.editor.dialog.add_labels"
          )
        )}
      </ha-chip-set>
    `;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const title = this.hass.localize(
      this._params.config.alias
        ? "ui.panel.config.automation.editor.rename"
        : "ui.common.save"
    );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._dialogClosed}
        header-title=${this._params.title || title}
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
                "ui.panel.config.automation.editor.missing_name"
              )}</ha-alert
            >`
          : ""}
        ${this._params.description
          ? html`<p>${this._params.description}</p>`
          : nothing}
        ${this._renderInputs()}
        <ha-dialog-footer slot="footer">
          ${this._renderDiscard()}
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._save}>
            ${this.hass.localize(
              this._params.config.alias && !this._params.onDiscard
                ? "ui.panel.config.automation.editor.rename"
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
    const target = ev.target as any;
    if (target.name === "description") {
      this._newDescription = target.value;
    } else {
      this._newName = target.value;
    }
  }

  private _handleDiscard() {
    this._params?.onDiscard?.();
    this.closeDialog();
  }

  private _generateTask = async (): Promise<SuggestWithAIGenerateTask> => {
    if (!this._params) {
      throw new Error("Dialog params not set");
    }
    return generateMetadataSuggestionTask<AutomationConfig | ScriptConfig>(
      this.hass.connection,
      this.hass.states,
      this.hass.language,
      this._params.domain,
      this._params.config
    );
  };

  private async _handleSuggestion(
    event: CustomEvent<GenDataTaskResult<MetadataSuggestionResult>>
  ) {
    if (!this._params) {
      throw new Error("Dialog params not set");
    }
    const result = event.detail;
    const processed = await processMetadataSuggestion(
      this.hass.connection,
      this._params.domain,
      result,
      SUGGESTION_INCLUDE_ALL
    );

    this._newName = processed.name;

    if (processed.description) {
      this._newDescription = processed.description;
      if (!this._visibleOptionals.includes("description")) {
        this._visibleOptionals = [...this._visibleOptionals, "description"];
      }
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
    if (!this._params) {
      return;
    }

    if (!this._newName) {
      this._error = "Name is required";
      return;
    }

    if (this._params.domain === "script") {
      await this._params.updateConfig(
        {
          ...this._params.config,
          alias: this._newName,
          description: this._newDescription,
          icon: this._newIcon,
        },
        this._entryUpdates
      );
    } else {
      await this._params.updateConfig(
        {
          ...this._params.config,
          alias: this._newName,
          description: this._newDescription,
        },
        this._entryUpdates
      );
    }

    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0 24px 24px 24px;
        }

        ha-textfield,
        ha-textarea,
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
          margin-top: 16px;
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
        }

        ha-suggest-with-ai-button {
          margin: 8px 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-automation-save": DialogAutomationSave;
  }
}
