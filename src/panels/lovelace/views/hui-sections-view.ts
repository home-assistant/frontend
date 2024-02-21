import { mdiArrowAll, mdiDelete, mdiPencil, mdiViewGridPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import "../../../components/ha-icon-button";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import { LovelaceSectionConfig as LovelaceRawSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { addSection, deleteSection, moveSection } from "../editor/config-util";
import {
  findLovelaceContainer,
  updateLovelaceContainer,
} from "../editor/lovelace-path";
import { HuiSection } from "../sections/hui-section";
import type { Lovelace } from "../types";

@customElement("hui-sections-view")
export class SectionsView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public sections: HuiSection[] = [];

  @state() private _config?: LovelaceViewConfig;

  public setConfig(config: LovelaceViewConfig): void {
    this._config = config;
  }

  private _sectionConfigKeys = new WeakMap<LovelaceRawSectionConfig, string>();

  private _getKey(sectionConfig: LovelaceRawSectionConfig) {
    if (!this._sectionConfigKeys.has(sectionConfig)) {
      this._sectionConfigKeys.set(sectionConfig, Math.random().toString());
    }
    return this._sectionConfigKeys.get(sectionConfig)!;
  }

  protected render() {
    if (!this.lovelace) return nothing;

    const sectionsConfig = this._config?.sections ?? [];

    const editMode = this.lovelace.editMode;

    return html`
      <ha-sortable
        .disabled=${!editMode}
        @item-moved=${this._sectionMoved}
        group="section"
        handle-selector=".handle"
        draggable-selector=".section"
        .rollback=${false}
      >
        <div class="container">
          ${repeat(
            sectionsConfig,
            (sectionConfig) => this._getKey(sectionConfig),
            (_sectionConfig, idx) => {
              const section = this.sections[idx];
              (section as any).itemPath = [idx];
              return html`
                <div class="section">
                  ${editMode
                    ? html`
                        <div class="section-overlay">
                          <div class="section-actions">
                            <ha-svg-icon
                              aria-hidden="true"
                              class="handle"
                              .path=${mdiArrowAll}
                            ></ha-svg-icon>
                            <ha-icon-button
                              .label=${this.hass.localize("ui.common.edit")}
                              @click=${this._editSection}
                              .index=${idx}
                              .path=${mdiPencil}
                            ></ha-icon-button>
                            <ha-icon-button
                              .label=${this.hass.localize("ui.common.delete")}
                              @click=${this._deleteSection}
                              .index=${idx}
                              .path=${mdiDelete}
                            ></ha-icon-button>
                          </div>
                        </div>
                      `
                    : nothing}
                  <div class="section-wrapper">${section}</div>
                </div>
              `;
            }
          )}
          ${editMode
            ? html`
                <button
                  class="add"
                  @click=${this._addSection}
                  aria-label=${this.hass.localize(
                    "ui.panel.lovelace.editor.section.add_section"
                  )}
                  .title=${this.hass.localize(
                    "ui.panel.lovelace.editor.section.add_section"
                  )}
                >
                  <ha-svg-icon .path=${mdiViewGridPlus}></ha-svg-icon>
                </button>
              `
            : nothing}
        </div>
      </ha-sortable>
    `;
  }

  private _addSection(): void {
    const newConfig = addSection(this.lovelace!.config, this.index!, {
      type: "grid",
      cards: [],
    });
    this.lovelace!.saveConfig(newConfig);
  }

  private async _editSection(ev) {
    const index = ev.currentTarget.index;

    const path = [this.index!, index] as [number, number];

    const section = findLovelaceContainer(
      this.lovelace!.config,
      path
    ) as LovelaceRawSectionConfig;

    const newTitle = !section.title;

    const title = await showPromptDialog(this, {
      title: this.hass.localize(
        `ui.panel.lovelace.editor.edit_section_title.${newTitle ? "title_new" : "title"}`
      ),
      inputLabel: this.hass.localize(
        "ui.panel.lovelace.editor.edit_section_title.input_label"
      ),
      inputType: "string",
      defaultValue: section.title,
      confirmText: newTitle
        ? this.hass.localize("ui.common.add")
        : this.hass.localize("ui.common.save"),
    });

    if (title === null) {
      return;
    }

    const newConfig = updateLovelaceContainer(this.lovelace!.config, path, {
      ...section,
      title: title || undefined,
    });

    this.lovelace!.saveConfig(newConfig);
  }

  private async _deleteSection(ev) {
    const index = ev.currentTarget.index;

    const path = [this.index!, index] as [number, number];

    const section = findLovelaceContainer(
      this.lovelace!.config,
      path
    ) as LovelaceRawSectionConfig;

    const title = section.title;
    const cardCount = section.cards?.length;

    if (title || cardCount) {
      const sectionName = title?.trim()
        ? this.hass.localize(
            "ui.panel.lovelace.editor.delete_section.named_section",
            { name: title }
          )
        : this.hass.localize(
            "ui.panel.lovelace.editor.delete_section.unnamed_section"
          );

      const content = cardCount
        ? this.hass.localize(
            "ui.panel.lovelace.editor.delete_section.text_section_and_cards",
            {
              section: sectionName,
            }
          )
        : this.hass.localize(
            "ui.panel.lovelace.editor.delete_section.text_section_only",
            {
              section: sectionName,
            }
          );

      const confirm = await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.lovelace.editor.delete_section.title"
        ),
        text: content,
        confirmText: this.hass.localize("ui.common.delete"),
        destructive: true,
      });

      if (!confirm) return;
    }

    const newConfig = deleteSection(this.lovelace!.config, this.index!, index);
    this.lovelace!.saveConfig(newConfig);
  }

  private _sectionMoved(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newConfig = moveSection(
      this.lovelace!.config,
      [this.index!, oldIndex],
      [this.index!, newIndex]
    );
    this.lovelace!.saveConfig(newConfig);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      .section {
        position: relative;
        border-radius: var(--ha-card-border-radius, 12px);
      }

      .container {
        --column-count: 3;
        display: grid;
        grid-template-columns: repeat(var(--column-count), minmax(0, 1fr));
        gap: 8px 20px;
        max-width: 1400px;
        padding: 20px;
        margin: 0 auto;
      }

      @media (max-width: 1200px) {
        .container {
          --column-count: 2;
        }
      }

      @media (max-width: 600px) {
        .container {
          --column-count: 1;
          padding: 8px;
        }
      }

      .section-actions {
        position: absolute;
        top: 0;
        right: 0;
        opacity: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease-in-out;
        background-color: rgba(var(--rgb-card-background-color), 0.3);
        border-radius: 18px;
        background: var(--secondary-background-color);
        --mdc-icon-button-size: 36px;
        --mdc-icon-size: 20px;
        color: var(--primary-text-color);
      }

      .handle {
        cursor: grab;
        padding: 8px;
      }

      .add {
        margin-top: calc(66px + 8px);
        outline: none;
        background: none;
        cursor: pointer;
        border-radius: var(--ha-card-border-radius, 12px);
        border: 2px dashed var(--primary-color);
        order: 1;
        height: 66px;
        padding: 8px;
        box-sizing: content-box;
      }

      .add:focus {
        border: 2px solid var(--primary-color);
      }

      .sortable-ghost {
        border-radius: var(--ha-card-border-radius, 12px);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sections-view": SectionsView;
  }
}
