import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-sortable";
import type { HaSortableOptions } from "../../../components/ha-sortable";
import type { LovelaceSectionElement } from "../../../data/lovelace";
import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
} from "../../../data/lovelace/config/section";
import { isStackSection } from "../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../types";
import "../components/hui-section-edit-mode";
import { addSection, moveSection } from "../editor/config-util";
import type { LovelaceSectionPath } from "../editor/lovelace-path";
import { findLovelaceContainer } from "../editor/lovelace-path";
import type { Lovelace } from "../types";
import { generateDefaultSection } from "../views/default-section";
import type { HuiSection } from "./hui-section";
import { SECTION_SORTABLE_OPTIONS } from "./section-sortable-options";
import {
  renderCreateSectionButton,
  createSectionButtonStyles,
} from "./render-create-section-button";
import { renderSection, sectionStyles } from "./render-section";

@customElement("hui-stack-section")
export class StackSection extends LitElement implements LovelaceSectionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ attribute: false }) public viewIndex?: number;

  @property({ attribute: false }) public index?: number;

  @property({ attribute: false }) public sectionPath?: LovelaceSectionPath;

  @property({ attribute: false }) public isStrategy = false;

  @property({ type: Boolean }) public preview = false;

  @state() private _sections: HuiSection[] = [];

  private readonly _sortableOptions: HaSortableOptions = {
    ...SECTION_SORTABLE_OPTIONS,
    group: {
      name: "section",
      put: (_to, _from, item) => {
        if (
          !this.lovelace ||
          !("sortableData" in item) ||
          !Array.isArray(item.sortableData)
        ) {
          return false;
        }
        const path = item.sortableData as LovelaceSectionPath;
        return !isStackSection(
          findLovelaceContainer(this.lovelace.config, path)
        );
      },
    },
  };

  public setConfig(config: LovelaceSectionConfig): void {
    if (!isStackSection(config) || !Array.isArray(config.sections)) {
      throw new Error("A section stack requires a sections array");
    }
    if (config.sections.some(isStackSection)) {
      throw new Error("Nested section stacks are not supported");
    }
    this._sections = config.sections.map((section) =>
      this._createSection(section)
    );
  }

  private _createSection(config: LovelaceSectionRawConfig): HuiSection {
    const section = document.createElement("hui-section");
    section.config = config;
    section.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._sections = this._sections.map((current) =>
          current === section ? this._createSection(config) : current
        );
      },
      { once: true }
    );
    return section;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (
      changed.has("_sections") ||
      changed.has("hass") ||
      changed.has("lovelace") ||
      changed.has("preview") ||
      changed.has("index") ||
      changed.has("viewIndex")
    ) {
      this._sections.forEach((section, index) => {
        section.hass = this.hass;
        section.lovelace = this.lovelace;
        section.preview = this.preview;
        section.viewIndex = this.viewIndex!;
        section.index = index;
        if (
          changed.has("_sections") ||
          changed.has("index") ||
          changed.has("viewIndex")
        ) {
          section.sectionPath = [this.viewIndex!, this.index!, index];
        }
      });
    }
  }

  protected updated(): void {
    this._updateVisibility();
  }

  protected render() {
    const editMode = Boolean(this.lovelace?.editMode && !this.isStrategy);
    return html`
      <ha-sortable
        .disabled=${!editMode}
        .options=${this._sortableOptions}
        draggable-selector=".section"
        handle-selector=".handle"
        @item-moved=${this._sectionMoved}
        @item-added=${this._sectionAdded}
        @item-removed=${this._sectionRemoved}
      >
        <div
          class="sections ${classMap({ empty: editMode && this._sections.length === 0 })}"
          @section-visibility-changed=${this._sectionVisibilityChanged}
        >
          ${repeat(
            this._sections,
            (section) => section,
            (section, index) => html`
              <div class="section" .sortableData=${section.path}>
                ${
                  editMode
                    ? html`
                        <hui-section-edit-mode
                          .hass=${this.hass}
                          .lovelace=${this.lovelace!}
                          .viewIndex=${this.viewIndex!}
                          .index=${index}
                          .stackIndex=${this.index}
                        >
                          ${renderSection(this.hass, section)}
                        </hui-section-edit-mode>
                      `
                    : renderSection(this.hass, section)
                }
              </div>
            `
          )}
          ${
            editMode
              ? renderCreateSectionButton(
                  this.hass.localize(
                    "ui.panel.lovelace.editor.section.create_section"
                  ),
                  this._addSection
                )
              : nothing
          }
        </div>
      </ha-sortable>
    `;
  }

  private _sectionVisibilityChanged(
    ev: HASSDomEvent<HASSDomEvents["section-visibility-changed"]>
  ): void {
    ev.stopPropagation();
    this._updateVisibility();
  }

  private _updateVisibility(): void {
    const hidden =
      !this.preview &&
      this._sections.length > 0 &&
      this._sections.every((section) => section.hidden);
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    fireEvent(this, "section-visibility-changed", { value: !hidden });
  }

  private _sectionMoved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    this.lovelace!.saveConfig(
      moveSection(
        this.lovelace!.config,
        [this.viewIndex!, this.index!, oldIndex],
        [this.viewIndex!, this.index!, newIndex]
      )
    );
  }

  private _sectionAdded(ev: HASSDomEvent<HASSDomEvents["item-added"]>): void {
    ev.stopPropagation();
    this.lovelace!.saveConfig(
      moveSection(
        this.lovelace!.config,
        ev.detail.data as LovelaceSectionPath,
        [this.viewIndex!, this.index!, ev.detail.index]
      )
    );
  }

  private _sectionRemoved(
    ev: HASSDomEvent<HASSDomEvents["item-removed"]>
  ): void {
    ev.stopPropagation();
    // The receiving container saves the move.
  }

  private _addSection(): void {
    this.lovelace!.saveConfig(
      addSection(
        this.lovelace!.config,
        this.viewIndex!,
        generateDefaultSection(this.hass.localize),
        this.index
      )
    );
  }

  static styles = [
    sectionStyles,
    createSectionButtonStyles,
    css`
      :host {
        display: block;
      }
      :host([hidden]) {
        display: none;
      }
      ha-sortable {
        display: contents;
      }
      .sections {
        display: flex;
        flex-direction: column;
        gap: var(--ha-view-sections-row-gap, 24px);
      }
      .create-section {
        margin: var(--ha-space-2);
        width: auto;
      }
      .sections.empty {
        padding: var(--ha-space-4);
      }
      .section {
        min-width: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-stack-section": StackSection;
  }
}
