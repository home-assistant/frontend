import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-adaptive-dialog";
import "../../../../components/ha-icon-button-arrow-prev";
import "../../../../components/ha-ripple";
import type { LovelaceStrategySectionConfig } from "../../../../data/lovelace/config/section";
import { CUSTOM_TYPE_PREFIX } from "../../../../data/lovelace_custom_cards";
import { getCustomStrategiesForType } from "../../../../data/lovelace_custom_strategies";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../../types";
import "../../sections/hui-section";
import { getLovelaceStrategy } from "../../strategies/get-strategy";
import type { LovelaceSectionStrategy } from "../../strategies/types";
import { getAtPath } from "../lovelace-path";
import type { CreateSectionDialogParams } from "./show-create-section-dialog";
import { showCreateSectionDialog } from "./show-create-section-dialog";
import { showEditSectionDialog } from "./show-edit-section-dialog";

interface BuiltInSectionStrategy {
  type: "common-controls" | "device" | "entities";
  isAvailable?: (hass: HomeAssistant) => boolean;
}

const BUILT_IN_SECTION_STRATEGIES: BuiltInSectionStrategy[] = [
  {
    type: "common-controls",
    isAvailable: (hass) => isComponentLoaded(hass.config, "usage_prediction"),
  },
  {
    type: "device",
  },
  {
    type: "entities",
  },
];

interface StrategyOption {
  type: string;
  name: string;
  description: string;
}

@customElement("hui-dialog-select-section-strategy")
export class HuiDialogSelectSectionStrategy
  extends LitElement
  implements HassDialog<CreateSectionDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CreateSectionDialogParams;

  @state() private _open = false;

  @state() private _previews: Record<string, LovelaceStrategySectionConfig> =
    {};

  public showDialog(params: CreateSectionDialogParams): void {
    this._params = params;
    this._open = true;
    this._previews = {};
    this._loadPreviews(params);
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._previews = {};
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _availableBuiltInTypes() {
    return BUILT_IN_SECTION_STRATEGIES.filter(
      (strategy) => strategy.isAvailable?.(this.hass) ?? true
    ).map((strategy) => strategy.type);
  }

  private _builtInOptions(): StrategyOption[] {
    return this._availableBuiltInTypes().map((type) => ({
      type,
      name: this.hass.localize(
        `ui.panel.lovelace.editor.section_strategy.${type}.name`
      ),
      description: this.hass.localize(
        `ui.panel.lovelace.editor.section_strategy.${type}.description`
      ),
    }));
  }

  private _customOptions(): StrategyOption[] {
    return getCustomStrategiesForType("section").map((strategy) => ({
      type: CUSTOM_TYPE_PREFIX + strategy.type,
      name: strategy.name || strategy.type,
      description: strategy.description || "",
    }));
  }

  private async _loadPreviews(params: CreateSectionDialogParams) {
    const types = [
      ...this._availableBuiltInTypes(),
      ...getCustomStrategiesForType("section").map(
        (strategy) => CUSTOM_TYPE_PREFIX + strategy.type
      ),
    ];
    await Promise.all(
      types.map(async (type) => {
        try {
          const strategy = (await getLovelaceStrategy(
            "section",
            type
          )) as LovelaceSectionStrategy;
          const stubConfig = await strategy.getStubConfig?.(this.hass);
          if (!stubConfig || this._params !== params) {
            return;
          }
          this._previews = {
            ...this._previews,
            [type]: { strategy: stubConfig },
          };
        } catch (_err: unknown) {
          // The tile is shown without a preview
        }
      })
    );
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const customOptions = this._customOptions();

    return html`
      <ha-adaptive-dialog
        .open=${this._open}
        width="large"
        @closed=${this._dialogClosed}
        header-title=${this.hass.localize(
          "ui.panel.lovelace.editor.select_section_strategy.header"
        )}
      >
        <ha-icon-button-arrow-prev
          slot="headerNavigationIcon"
          @click=${this._back}
        ></ha-icon-button-arrow-prev>
        ${
          customOptions.length
            ? html`
                <h3>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.select_section_strategy.built_in"
                  )}
                </h3>
              `
            : nothing
        }
        <div class="options">
          ${this._builtInOptions().map((option) => this._renderOption(option))}
        </div>
        ${
          customOptions.length
            ? html`
                <h3>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.select_section_strategy.custom"
                  )}
                </h3>
                <div class="options">
                  ${customOptions.map((option) => this._renderOption(option))}
                </div>
              `
            : nothing
        }
      </ha-adaptive-dialog>
    `;
  }

  private _renderOption(option: StrategyOption) {
    const preview = this._previews[option.type];
    return html`
      <div
        class="option"
        role="button"
        tabindex="0"
        aria-label=${option.name}
        data-type=${option.type}
        @click=${this._strategyPicked}
        @keydown=${this._handleKeyDown}
      >
        <div class="header">
          <h4>${option.name}</h4>
          <p>${option.description}</p>
        </div>
        ${
          preview
            ? html`
                <div class="preview" inert>
                  <hui-section
                    .hass=${this.hass}
                    .config=${preview}
                    preview
                  ></hui-section>
                </div>
              `
            : nothing
        }
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      (ev.currentTarget as HTMLElement).click();
    }
  }

  private _back() {
    showCreateSectionDialog(this, this._params!);
    this.closeDialog();
  }

  private _strategyPicked(ev: Event) {
    const type = (ev.currentTarget as HTMLElement).dataset.type!;
    const { lovelace, containerPath } = this._params!;
    const sectionsPath = [...containerPath, "sections"];
    const sectionCount =
      getAtPath<unknown[]>(lovelace.config, sectionsPath)?.length ?? 0;

    showEditSectionDialog(this, {
      lovelace,
      lovelaceConfig: lovelace.config,
      saveConfig: (newConfig) => {
        lovelace.saveConfig(newConfig);
      },
      path: [...sectionsPath, sectionCount],
      newSection: this._previews[type] ?? { strategy: { type } },
    });
    this.closeDialog();
  }

  static styles = css`
    h3 {
      margin: 0 0 var(--ha-space-3) 0;
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }
    .options + h3 {
      margin-top: var(--ha-space-6);
    }
    .options {
      display: grid;
      gap: var(--ha-space-4);
      grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
    }
    .option {
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-lg);
      cursor: pointer;
      outline: none;
    }
    .option:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .header {
      flex: 1;
      padding: var(--ha-space-3) var(--ha-space-4);
    }
    h4 {
      margin: 0 0 var(--ha-space-1) 0;
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
      color: var(--primary-text-color);
    }
    p {
      margin: 0;
      font-size: var(--ha-font-size-m);
      color: var(--secondary-text-color);
    }
    .preview {
      height: 200px;
      overflow: hidden;
      padding: var(--ha-space-3);
      background: var(--primary-background-color);
      pointer-events: none;
      mask-image: linear-gradient(to bottom, black 75%, transparent);
    }
    hui-section {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-select-section-strategy": HuiDialogSelectSectionStrategy;
  }
}
