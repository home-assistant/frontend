import {
  mdiBackupRestore,
  mdiCheck,
  mdiContentDuplicate,
  mdiMinus,
  mdiPlus,
} from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-outlined-icon-button";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import { actionHandler } from "../../../panels/lovelace/common/directives/action-handler-directive";

const SORTABLE_OPTIONS = {
  delay: 250,
  delayOnTouchOnly: true,
};

@customElement("ha-more-info-favorites")
export class HaMoreInfoFavorites extends LitElement {
  @property({ attribute: false }) public items: unknown[] = [];

  @property({ attribute: false })
  public renderItem?: (
    item: unknown,
    index: number,
    editMode: boolean
  ) => TemplateResult;

  @property({ attribute: false })
  public deleteLabel?: (index: number) => string;

  @property({ type: Boolean, attribute: false }) public editMode = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: false }) public isAdmin = false;

  @property({ type: Boolean, attribute: false }) public showAdd = true;

  @property({ type: Boolean, attribute: false }) public showDone = true;

  @property({ type: Boolean, attribute: false }) public showReset = false;

  @property({ type: Boolean, attribute: false }) public showCopy = false;

  @property({ attribute: false }) public addLabel = "";

  @property({ attribute: false }) public doneLabel = "";

  @property({ attribute: false }) public resetLabel = "";

  @property({ attribute: false }) public copyLabel = "";

  @property({ type: Boolean, attribute: false }) public resetDisabled = false;

  private _itemMoved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>): void {
    ev.stopPropagation();
    fireEvent(this, "favorite-item-moved", ev.detail);
  }

  private _handleItemAction = (
    ev: HASSDomEvent<HASSDomEvents["action"]>
  ): void => {
    ev.stopPropagation();
    const target = ev.currentTarget as HTMLElement;
    fireEvent(this, "favorite-item-action", {
      index: Number(target.dataset.index),
      action: ev.detail.action,
    });
  };

  private _handleDelete = (ev: MouseEvent): void => {
    ev.stopPropagation();
    const target = ev.currentTarget as HTMLElement;
    fireEvent(this, "favorite-item-delete", {
      index: Number(target.dataset.index),
    });
  };

  private _handleAdd = (ev: MouseEvent): void => {
    ev.stopPropagation();
    fireEvent(this, "favorite-item-add");
  };

  private _handleDone = (ev: MouseEvent): void => {
    ev.stopPropagation();
    fireEvent(this, "favorite-item-done");
  };

  private _handleReset = (ev: MouseEvent): void => {
    ev.stopPropagation();
    fireEvent(this, "favorite-reset");
  };

  private _handleCopy = (ev: MouseEvent): void => {
    ev.stopPropagation();
    fireEvent(this, "favorite-copy");
  };

  protected render(): TemplateResult {
    return html`
      <ha-sortable
        @item-moved=${this._itemMoved}
        draggable-selector=".favorite"
        no-style
        .disabled=${!this.editMode}
        .options=${SORTABLE_OPTIONS}
      >
        <div class="container">
          ${this.items.map(
            (item, index) => html`
              <div class="favorite">
                <div
                  class="favorite-bubble ${classMap({
                    shake: !!this.editMode,
                  })}"
                >
                  <div
                    class="item"
                    data-index=${String(index)}
                    .actionHandler=${actionHandler({
                      hasHold: !this.editMode && this.isAdmin,
                      disabled: this.disabled,
                    })}
                    @action=${this._handleItemAction}
                  >
                    ${this.renderItem
                      ? this.renderItem(item, index, this.editMode)
                      : nothing}
                  </div>
                  ${this.editMode
                    ? html`
                        <button
                          @click=${this._handleDelete}
                          class="delete"
                          data-index=${String(index)}
                          aria-label=${ifDefined(this.deleteLabel?.(index))}
                          title=${ifDefined(this.deleteLabel?.(index))}
                        >
                          <ha-svg-icon .path=${mdiMinus}></ha-svg-icon>
                        </button>
                      `
                    : nothing}
                </div>
              </div>
            `
          )}
          ${this.editMode && this.showAdd
            ? html`
                <ha-outlined-icon-button
                  id="add-btn"
                  class="button"
                  @click=${this._handleAdd}
                  .label=${this.addLabel}
                >
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                </ha-outlined-icon-button>
                <ha-tooltip for="add-btn">${this.addLabel}</ha-tooltip>
              `
            : nothing}
          ${this.editMode && this.showDone
            ? html`
                <ha-outlined-icon-button
                  id="done-btn"
                  @click=${this._handleDone}
                  class="button"
                  .label=${this.doneLabel}
                >
                  <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
                </ha-outlined-icon-button>
                <ha-tooltip for="done-btn">${this.doneLabel}</ha-tooltip>
              `
            : nothing}
        </div>
      </ha-sortable>
      ${this.editMode && (this.showReset || this.showCopy)
        ? html`
            <div class="actions">
              ${this.showReset
                ? html`
                    <ha-button
                      appearance="outlined"
                      variant="neutral"
                      @click=${this._handleReset}
                      .disabled=${this.resetDisabled}
                    >
                      <ha-svg-icon
                        slot="start"
                        .path=${mdiBackupRestore}
                      ></ha-svg-icon>
                      ${this.resetLabel}
                    </ha-button>
                  `
                : nothing}
              ${this.showCopy
                ? html`
                    <ha-button
                      appearance="outlined"
                      variant="neutral"
                      @click=${this._handleCopy}
                    >
                      <ha-svg-icon
                        slot="start"
                        .path=${mdiContentDuplicate}
                      ></ha-svg-icon>
                      ${this.copyLabel}
                    </ha-button>
                  `
                : nothing}
            </div>
          `
        : nothing}
    `;
  }

  static styles = css`
    .container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: calc(var(--ha-space-2) * -1);
      flex-wrap: wrap;
      max-width: var(--favorite-items-max-width, 250px);
      user-select: none;
    }

    .container > * {
      margin: var(--ha-space-2);
    }

    .favorite {
      display: block;
    }

    .favorite .favorite-bubble.shake {
      position: relative;
      display: block;
      animation: shake 0.45s linear infinite;
    }

    .favorite:nth-child(3n + 1) .favorite-bubble.shake {
      animation-delay: 0.15s;
    }

    .favorite:nth-child(3n + 2) .favorite-bubble.shake {
      animation-delay: 0.3s;
    }

    .sortable-ghost {
      opacity: 0.4;
    }

    .sortable-fallback {
      display: none;
    }

    @keyframes shake {
      0% {
        transform: rotateZ(0deg) translateX(-1px) translateY(0) scale(1);
      }
      20% {
        transform: rotateZ(-3deg) translateX(0) translateY(0);
      }
      40% {
        transform: rotateZ(0deg) translateX(1px) translateY(0);
      }
      60% {
        transform: rotateZ(3deg) translateX(0) translateY(0);
      }
      100% {
        transform: rotateZ(0deg) translateX(-1px) translateY(0);
      }
    }

    .delete {
      position: absolute;
      top: -6px;
      right: -6px;
      inset-inline-end: -6px;
      inset-inline-start: initial;
      width: 20px;
      height: 20px;
      outline: none;
      background-color: var(--secondary-background-color);
      padding: 0;
      border-radius: var(--ha-border-radius-md);
      border: none;
      cursor: pointer;
      display: block;
      --mdc-icon-size: 12px;
      color: var(--primary-text-color);
    }

    .delete * {
      pointer-events: none;
    }

    ha-control-button.active {
      --control-button-background-color: var(
        --favorite-item-active-background-color
      );
    }

    .actions {
      display: flex;
      flex-direction: row;
      justify-content: center;
      gap: var(--ha-space-2);
      margin-top: var(--ha-space-2);
      flex-wrap: wrap;
    }
  `;
}

declare global {
  interface HASSDomEvents {
    "favorite-item-action": {
      index: number;
      action: string;
    };
    "favorite-item-delete": {
      index: number;
    };
    "favorite-item-add";
    "favorite-item-done";
    "favorite-reset";
    "favorite-copy";
    "favorite-item-moved": {
      oldIndex: number;
      newIndex: number;
    };
  }

  interface HTMLElementTagNameMap {
    "ha-more-info-favorites": HaMoreInfoFavorites;
  }
}
