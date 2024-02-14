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
import { addSection, deleteSection } from "../editor/config-util";
import { HuiSection } from "../sections/hui-section";
import type { Lovelace } from "../types";

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
              (section as any).editMode = editMode;
              (section as any).itemPath = [idx];
              return html`
                <div class="section">
                  <div class="section-wrapper">${section}</div>
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

  private _editSection(_ev): void {
    // TODO edit section
  }

  private _deleteSection(ev): void {
    const sectionIndex = ev.currentTarget.index;
    const newConfig = deleteSection(
      this.lovelace!.config,
      this.index!,
      sectionIndex
    );
    this.lovelace!.saveConfig(newConfig);
  }

  private _sectionMoved(_ev: CustomEvent) {
    // TODO move section
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        padding-top: 4px;
      }

      .section {
        position: relative;
      }

      .container {
        --column-count: 3;
        display: grid;
        grid-template-columns: repeat(var(--column-count), minmax(0, 1fr));
        gap: 10px;
        max-width: 1200px;
        padding: 10px;
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
        }
      }

      .section-overlay {
        position: absolute;
        top: 0;
        right: 0;
        display: flex;
        opacity: 0;
        pointer-events: none;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease-in-out;
        background-color: rgba(var(--rgb-card-background-color), 0.3);
      }

      .section:hover .section-overlay {
        opacity: 1;
        pointer-events: auto;
      }

      .section-actions {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .section-actions ha-svg-icon {
        padding: 4px;
      }
      .handle {
        cursor: grab;
      }
      .add {
        background: none;
        cursor: pointer;
        border-radius: var(--ha-card-border-radius, 12px);
        border: 2px dashed var(--primary-color);
        min-height: 60px;
        order: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-view": SectionView;
  }
}
