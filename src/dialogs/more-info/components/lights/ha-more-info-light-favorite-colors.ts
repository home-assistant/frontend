import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-control-slider";
import { ON, UNAVAILABLE } from "../../../../data/entity";
import {
  ExtEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../../data/entity_registry";
import {
  computeDefaultFavoriteColors,
  LightColor,
  LightEntity,
} from "../../../../data/light";
import { HomeAssistant } from "../../../../types";
import "./ha-favorite-color-button";
import { showLightColorFavoriteDialog } from "./show-dialog-light-color-favorite";

@customElement("ha-more-info-light-favorite-colors")
export class HaMoreInfoLightFavoriteColors extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @state() private _focusedFavoriteIndex?: number;

  protected updated(changedProps: PropertyValues<typeof this>): void {
    if (changedProps.has("stateObj")) {
      if (this.stateObj?.state !== ON) {
        this._focusedFavoriteIndex = undefined;
      }
    }
  }

  private get _favoriteColors(): LightColor[] {
    if (this.entry) {
      if (this.entry.options?.light?.favorite_colors) {
        return this.entry.options.light.favorite_colors;
      }
      if (this.stateObj) {
        return computeDefaultFavoriteColors(this.stateObj);
      }
    }
    return [];
  }

  private _editFavoriteColor = async (index) => {
    // Make sure the current favorite color is set
    this._applyFavoriteColor(index);
    const color = await showLightColorFavoriteDialog(this, {
      entry: this.entry!,
    });

    if (color) {
      const newFavoriteColors = [...this._favoriteColors];

      newFavoriteColors[index] = color;

      const result = await updateEntityRegistryEntry(
        this.hass,
        this.entry!.entity_id,
        {
          options_domain: "light",
          options: {
            favorite_colors: newFavoriteColors,
          },
        }
      );

      fireEvent(this, "entity-entry-updated", result.entity_entry);
    } else {
      this._applyFavoriteColor(index);
    }
    this._focusedFavoriteIndex = index;
  };

  private _applyFavoriteColor = (index: number) => {
    const favorite = this._favoriteColors[index];
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      ...favorite,
    });
  };

  private _handleColorButton = (ev) => {
    ev.stopPropagation();
    const index = ev.target.index;
    if (this._focusedFavoriteIndex === index) {
      this._editFavoriteColor(index);
      return;
    }
    if (this.hass.user?.is_admin) {
      this._focusedFavoriteIndex = index;
    }
    this._applyFavoriteColor(index);
  };

  private _removeFocus = () => {
    this._focusedFavoriteIndex = undefined;
  };

  protected render(): TemplateResult {
    return html`
      <div class="container">
        ${this._favoriteColors.map((color, index) => {
          const editMode = this._focusedFavoriteIndex === index;
          return html`
            <ha-favorite-color-button
              .label=${this.hass.localize(
                `ui.dialogs.more_info_control.light.favorite_color.${
                  editMode ? "edit" : "set"
                }`,
                { number: index }
              )}
              .disabled=${this.stateObj!.state === UNAVAILABLE}
              .color=${color}
              .index=${index}
              @click=${this._handleColorButton}
              @blur=${this._removeFocus}
              .editMode=${editMode}
            >
            </ha-favorite-color-button>
          `;
        })}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
        flex-wrap: wrap;
        max-width: 250px;
      }

      .container > * {
        margin: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-favorite-colors": HaMoreInfoLightFavoriteColors;
  }
}
