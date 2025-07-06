import "@material/mwc-button";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiClose, mdiPlus, mdiStarFourPoints } from "@mdi/js";
import { dump } from "js-yaml";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-domain-icon";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-textarea";
import "../../../../components/ha-textfield";
import "../../../../components/ha-labels-picker";
import "../../category/ha-category-picker";
import "../../../../components/ha-expansion-panel";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/chips/ha-assist-chip";
import "../../../../components/ha-area-picker";

import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type {
  EntityRegistryUpdate,
  SaveDialogParams,
} from "./show-dialog-automation-save";
import { supportsMarkdownHelper } from "../../../../common/translations/markdown_support";
import {
  fetchAITaskPreferences,
  generateDataAITask,
} from "../../../../data/ai_task";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { subscribeOne } from "../../../../common/util/subscribe-one";
import { subscribeLabelRegistry } from "../../../../data/label_registry";

@customElement("ha-dialog-automation-save")
class DialogAutomationSave extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _error?: string;

  @state() private _visibleOptionals: string[] = [];

  @state() private _entryUpdates!: EntityRegistryUpdate;

  @state() private _canSuggest = false;

  private _params!: SaveDialogParams;

  @state() private _newName?: string;

  private _newIcon?: string;

  private _newDescription?: string;

  public showDialog(params: SaveDialogParams): void {
    this._opened = true;
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

  public closeDialog() {
    this._params.onClose();

    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._visibleOptionals = [];
    return true;
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (isComponentLoaded(this.hass, "ai_task")) {
      fetchAITaskPreferences(this.hass).then((prefs) => {
        this._canSuggest = prefs.gen_data_entity_id !== null;
      });
    }
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
    if (!this._params.onDiscard) {
      return nothing;
    }
    return html`
      <ha-button
        @click=${this._handleDiscard}
        slot="secondaryAction"
        class="destructive"
      >
        ${this.hass.localize("ui.common.dont_save")}
      </ha-button>
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
                slot="fallback"
                domain=${this._params.domain}
                .hass=${this.hass}
              >
              </ha-domain-icon>
            </ha-icon-picker>
          `
        : nothing}
      ${this._visibleOptionals.includes("description")
        ? html` <ha-textarea
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
            @input=${this._valueChanged}
          ></ha-textarea>`
        : nothing}
      ${this._visibleOptionals.includes("category")
        ? html` <ha-category-picker
            id="category"
            .hass=${this.hass}
            .scope=${this._params.domain}
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
    if (!this._opened) {
      return nothing;
    }

    const title = this.hass.localize(
      this._params.config.alias
        ? "ui.panel.config.automation.editor.rename"
        : "ui.panel.config.automation.editor.save"
    );

    return html`
      <ha-dialog
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${title}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${this._params.title || title}</span>
          ${this._canSuggest
            ? html`
                <ha-assist-chip
                  id="suggest"
                  slot="actionItems"
                  @click=${this._suggest}
                  label=${this.hass.localize("ui.common.suggest_ai")}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiStarFourPoints}
                  ></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
        </ha-dialog-header>
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
        ${this._renderInputs()} ${this._renderDiscard()}

        <div slot="primaryAction">
          <mwc-button @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.cancel")}
          </mwc-button>
          <mwc-button @click=${this._save}>
            ${this.hass.localize(
              this._params.config.alias && !this._params.onDiscard
                ? "ui.panel.config.automation.editor.rename"
                : "ui.panel.config.automation.editor.save"
            )}
          </mwc-button>
        </div>
      </ha-dialog>
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
    this._params.onDiscard?.();
    this.closeDialog();
  }

  private async _suggest() {
    const labels = await subscribeOne(
      this.hass.connection,
      subscribeLabelRegistry
    ).then((labs) =>
      Object.fromEntries(labs.map((lab) => [lab.label_id, lab.name]))
    );
    const automationInspiration: string[] = [];

    for (const automation of Object.values(this.hass.states)) {
      const entityEntry = this.hass.entities[automation.entity_id];
      if (
        computeStateDomain(automation) !== "automation" ||
        automation.attributes.restored ||
        !automation.attributes.friendly_name ||
        !entityEntry
      ) {
        continue;
      }

      let inspiration = `- ${automation.attributes.friendly_name}`;

      if (entityEntry.labels.length) {
        inspiration += ` (labels: ${entityEntry.labels
          .map((label) => labels[label])
          .join(", ")})`;
      }

      automationInspiration.push(inspiration);
    }

    const result = await generateDataAITask<{
      name: string;
      description: string | undefined;
      labels: string[] | undefined;
    }>(this.hass, {
      task_name: "frontend:automation:save",
      instructions: `Suggest in language "${this.hass.language}" a name, description, and labels for the following Home Assistant automation.

The name should be relevant to the automation's purpose.
${
  automationInspiration.length
    ? `The name should be in same style as existing automations.
Suggest labels if relevant to the automation's purpose.
Only suggest labels that are already used by existing automations.`
    : `The name should be short, descriptive, sentence case, and written in the language ${this.hass.language}.`
}
If the automation contains 5+ steps, include a short description.

For inspiration, here are existing automations:
${automationInspiration.join("\n")}

The automation configuration is as follows:
${dump(this._params.config)}
`,
      structure: {
        name: {
          description: "The name of the automation",
          required: true,
          selector: {
            text: {},
          },
        },
        description: {
          description: "A short description of the automation",
          required: false,
          selector: {
            text: {},
          },
        },
        labels: {
          description: "Labels for the automation",
          required: false,
          selector: {
            text: {
              multiple: true,
            },
          },
        },
      },
    });
    this._newName = result.data.name;
    if (result.data.description) {
      this._newDescription = result.data.description;
      if (!this._visibleOptionals.includes("description")) {
        this._visibleOptionals = [...this._visibleOptionals, "description"];
      }
    }
    if (result.data.labels?.length) {
      // We get back label names, convert them to IDs
      const newLabels: Record<string, undefined | string> = Object.fromEntries(
        result.data.labels.map((name) => [name, undefined])
      );
      let toFind = result.data.labels.length;
      for (const [labelId, labelName] of Object.entries(labels)) {
        if (labelName in newLabels && newLabels[labelName] === undefined) {
          newLabels[labelName] = labelId;
          toFind--;
          if (toFind === 0) {
            break;
          }
        }
      }
      const foundLabels = Object.values(newLabels).filter(
        (labelId) => labelId !== undefined
      );
      if (foundLabels.length) {
        this._entryUpdates = {
          ...this._entryUpdates,
          labels: foundLabels,
        };
        if (!this._visibleOptionals.includes("labels")) {
          this._visibleOptionals = [...this._visibleOptionals, "labels"];
        }
      }
    }
  }

  private async _save(): Promise<void> {
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
        ha-dialog {
          --dialog-content-padding: 0 24px 24px 24px;
        }

        @media all and (min-width: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: min(500px, 95vw);
            --mdc-dialog-max-width: min(500px, 95vw);
          }
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
        ha-chip-set {
          margin-top: 16px;
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
        }
        .destructive {
          --mdc-theme-primary: var(--error-color);
        }

        #suggest {
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
