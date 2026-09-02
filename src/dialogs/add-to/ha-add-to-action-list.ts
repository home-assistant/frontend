import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../common/translations/localize";
import "../../components/ha-icon";
import "../../components/ha-svg-icon";
import type { HaListItemButton } from "../../components/item/ha-list-item-button";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-grouped-list";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";

export interface AddToActionListItem {
  name?: string;
  nameKey?: LocalizeKeys;
  description?: string;
  descriptionKey?: LocalizeKeys;
  icon?: string;
  iconPath?: string;
  enabled?: boolean;
}

export interface AddToActionListSection<
  Item extends AddToActionListItem = AddToActionListItem,
> {
  title?: string;
  titleKey?: LocalizeKeys;
  actions: readonly Item[];
  empty?: string;
  emptyKey?: LocalizeKeys;
}

export interface AddToActionListActionSelectedDetail<
  Item extends AddToActionListItem = AddToActionListItem,
> {
  action: Item;
}

export type AddToActionListActionSelectedEvent<
  Item extends AddToActionListItem = AddToActionListItem,
> = HASSDomEvent<AddToActionListActionSelectedDetail<Item>>;

@customElement("ha-add-to-action-list")
class HaAddToActionList extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false })
  public sections: readonly AddToActionListSection[] = [];

  protected render(): TemplateResult | typeof nothing {
    if (!this.sections.length) {
      return nothing;
    }

    return html`${this.sections.map((section, sectionIndex) =>
      this._renderSection(section, sectionIndex)
    )}`;
  }

  private _renderSection(
    section: AddToActionListSection,
    sectionIndex: number
  ): TemplateResult | typeof nothing {
    if (!section.actions.length && !section.empty && !section.emptyKey) {
      return nothing;
    }

    return html`
      <ha-grouped-list
        .header=${this._localizeValue(section.title, section.titleKey)}
      >
        ${
          section.actions.length
            ? section.actions.map((action, actionIndex) =>
                this._renderActionItem(action, sectionIndex, actionIndex)
              )
            : html`<div class="empty">
                ${this._localizeValue(section.empty, section.emptyKey)}
              </div>`
        }
      </ha-grouped-list>
    `;
  }

  private _renderActionItem(
    action: AddToActionListItem,
    sectionIndex: number,
    actionIndex: number
  ): TemplateResult {
    return html`
      <ha-list-item-button
        .disabled=${action.enabled === false}
        data-section-index=${sectionIndex}
        data-action-index=${actionIndex}
        .headline=${this._localizeValue(action.name, action.nameKey)}
        .supportingText=${this._localizeValue(
          action.description,
          action.descriptionKey
        )}
        @click=${this._actionSelected}
      >
        ${
          action.icon
            ? html`<ha-icon
                class="start-icon"
                slot="start"
                .icon=${action.icon}
              ></ha-icon>`
            : action.iconPath
              ? html`<ha-svg-icon
                  class="start-icon"
                  slot="start"
                  .path=${action.iconPath}
                ></ha-svg-icon>`
              : nothing
        }
        <ha-svg-icon class="plus" slot="end" .path=${mdiPlus}></ha-svg-icon>
      </ha-list-item-button>
    `;
  }

  private _localizeValue(
    value?: string,
    localizeKey?: LocalizeKeys
  ): string | undefined {
    return value || (localizeKey ? this._localize(localizeKey) : undefined);
  }

  private _actionSelected(
    ev: HASSDomCurrentTargetEvent<HaListItemButton>
  ): void {
    const action =
      this.sections[Number(ev.currentTarget.dataset.sectionIndex)]?.actions[
        Number(ev.currentTarget.dataset.actionIndex)
      ];

    if (!action) {
      return;
    }

    if (action.enabled === false) {
      return;
    }

    fireEvent(this, "add-to-list-action-selected", {
      action,
    });
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      padding: 0 var(--ha-space-6);
    }

    ha-grouped-list + ha-grouped-list {
      margin-top: var(--ha-space-6);
    }

    .empty {
      padding: var(--ha-space-2) var(--ha-space-3);
      font-size: var(--ha-font-size-m);
      color: var(--secondary-text-color);
    }

    ha-icon,
    ha-svg-icon {
      display: flex;
      align-items: center;
    }

    .start-icon {
      color: var(--ha-color-text-secondary);
    }

    .plus {
      color: var(--secondary-text-color);
    }

    ha-list-item-button[disabled] .start-icon,
    ha-list-item-button[disabled] .plus {
      color: var(--disabled-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-add-to-action-list": HaAddToActionList;
  }

  interface HASSDomEvents {
    "add-to-list-action-selected": AddToActionListActionSelectedDetail;
  }
}
