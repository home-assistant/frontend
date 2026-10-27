import { mdiViewGridPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-ripple";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { LovelaceSectionElement } from "../../../data/lovelace";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import { isStrategySection } from "../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../types";
import "../components/hui-section-edit-mode";
import type { LovelacePath } from "../editor/lovelace-path";
import { moveAtPath } from "../editor/lovelace-path";
import { showCreateSectionDialog } from "../editor/section-editor/show-create-section-dialog";
import type { Lovelace } from "../types";
import type { HuiSection } from "./hui-section";
import {
  renderSectionContainer,
  sectionContainerStyles,
} from "./section-container";

@customElement("hui-stack-section")
export class HuiStackSection
  extends LitElement
  implements LovelaceSectionElement
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ attribute: false }) public path?: LovelacePath;

  @property({ attribute: false }) public isStrategy = false;

  @property({ attribute: false }) public sections: HuiSection[] = [];

  public setConfig(_config: LovelaceSectionConfig): void {
    // The stack has no settings of its own
  }

  protected render() {
    const { hass, lovelace, path } = this;
    if (!hass) {
      return nothing;
    }

    const editMode = Boolean(lovelace?.editMode && !this.isStrategy);
    if (!editMode || !lovelace || !path) {
      return html`
        <div class="sections">
          ${repeat(
            this.sections,
            (section) => section,
            (section) =>
              html`<div class="section">
                ${renderSectionContainer(hass, section.config, section)}
              </div>`
          )}
        </div>
      `;
    }

    const sectionsPath = [...path, "sections"];

    return html`
      <ha-sortable
        @item-moved=${this._sectionMoved}
        @item-added=${this._sectionAdded}
        @item-removed=${this._sectionRemoved}
        group="section"
        handle-selector=".handle"
        draggable-selector=".section"
      >
        <div class="sections">
          ${repeat(
            this.sections,
            (section) => section,
            (section, idx) => html`
              <div class="section" .sortableData=${[...sectionsPath, idx]}>
                <hui-section-edit-mode
                  .hass=${hass}
                  .lovelace=${lovelace}
                  .path=${[...sectionsPath, idx]}
                  .isStrategy=${isStrategySection(section.config)}
                >
                  ${renderSectionContainer(hass, section.config, section)}
                </hui-section-edit-mode>
              </div>
            `
          )}
          <button
            class="create-section"
            @click=${this._createSection}
            aria-label=${hass.localize(
              "ui.panel.lovelace.editor.section.create_section"
            )}
            .title=${hass.localize(
              "ui.panel.lovelace.editor.section.create_section"
            )}
          >
            <ha-ripple></ha-ripple>
            <ha-svg-icon .path=${mdiViewGridPlus}></ha-svg-icon>
          </button>
        </div>
      </ha-sortable>
    `;
  }

  private _sectionMoved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const sectionsPath = [...this.path!, "sections"];
    this.lovelace!.saveConfig(
      moveAtPath(
        this.lovelace!.config,
        [...sectionsPath, oldIndex],
        [...sectionsPath, newIndex]
      )
    );
  }

  private _sectionAdded(ev: HASSDomEvent<HASSDomEvents["item-added"]>) {
    ev.stopPropagation();
    const { index, data } = ev.detail;
    this.lovelace!.saveConfig(
      moveAtPath(this.lovelace!.config, data as LovelacePath, [
        ...this.path!,
        "sections",
        index,
      ])
    );
  }

  private _sectionRemoved(ev: HASSDomEvent<HASSDomEvents["item-removed"]>) {
    // The list the section is dropped in moves it
    ev.stopPropagation();
  }

  private _createSection() {
    showCreateSectionDialog(this, {
      lovelace: this.lovelace!,
      containerPath: this.path!,
    });
  }

  static styles = [
    sectionContainerStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }
      .sections {
        display: flex;
        flex-direction: column;
        gap: var(--row-gap, 8px);
      }
      .section:has(hui-section[hidden]) {
        display: none;
      }
      .create-section {
        display: block;
        position: relative;
        outline: none;
        background: none;
        cursor: pointer;
        border-radius: var(
          --ha-section-border-radius,
          var(--ha-border-radius-xl)
        );
        border: 2px dashed var(--primary-color);
        height: calc(var(--row-height, 56px) + 2 * (var(--row-gap, 8px) + 2px));
        padding: var(--ha-space-2);
        box-sizing: border-box;
        width: 100%;
        --ha-ripple-color: var(--primary-color);
        --ha-ripple-hover-opacity: 0.04;
        --ha-ripple-pressed-opacity: 0.12;
      }
      .create-section:focus {
        border: 2px solid var(--primary-color);
      }
      .sortable-ghost {
        border-radius: var(
          --ha-section-border-radius,
          var(--ha-border-radius-xl)
        );
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-stack-section": HuiStackSection;
  }
}
