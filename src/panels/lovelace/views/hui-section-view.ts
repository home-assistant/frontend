import { mdiArrowAll, mdiDelete, mdiPencil, mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import "../../../components/ha-icon-button";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import { LovelaceSectionConfig as LovelaceRawSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import { addSection, deleteSection, moveSection } from "../editor/config-util";
import { HuiSection } from "../sections/hui-section";
import type { Lovelace } from "../types";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import {
  findLovelaceContainer,
  updateLovelaceContainer,
} from "../editor/lovelace-path";

@customElement("hui-section-view")
export class SectionView extends LitElement implements LovelaceViewElement {
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
        <div class="container ${classMap({ "edit-mode": editMode })}">
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
                              class="handle"
                              .path=${mdiArrowAll}
                            ></ha-svg-icon>
                            <ha-icon-button
                              @click=${this._editSection}
                              .index=${idx}
                              .path=${mdiPencil}
                            ></ha-icon-button>
                            <ha-icon-button
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
                <button class="add" @click=${this._addSection}>
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
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

    const addTitle = !section.title;

    const title = await showPromptDialog(this, {
      title: addTitle ? "Add section title" : "Change section title",
      inputLabel: "Title",
      inputType: "string",
      defaultValue: section.title,
      confirmText: addTitle ? "Add" : "Update",
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

    let content = title ? `"${title}" section` : "This section";
    if (cardCount) {
      content += ` and ${cardCount} card${cardCount > 1 ? "s" : ""} in it will be deleted`;
    }
    content += ".";

    const confirm = await showConfirmationDialog(this, {
      title: "Delete section",
      text: content,
      confirmText: "Delete",
      destructive: true,
    });

    if (!confirm) return;

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
      }

      .section-actions ha-svg-icon {
        padding: 8px;
      }

      .section-actions {
        border-radius: var(--ha-card-border-radius, 12px);
        background: var(--secondary-background-color);
        --mdc-icon-button-size: 36px;
        --mdc-icon-size: 20px;
        color: var(--primary-text-color);
      }
      .handle {
        cursor: grab;
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
    "hui-section-view": SectionView;
  }
}
