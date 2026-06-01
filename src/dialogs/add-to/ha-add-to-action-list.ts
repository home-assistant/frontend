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
import "../../components/list/ha-list-base";
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

type AddToActionListItemButton = HaListItemButton & {
  action: AddToActionListItem;
};

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

    return html`${this.sections.map((section) => this._renderSection(section))}`;
  }

  private _renderSection(
    section: AddToActionListSection
  ): TemplateResult | typeof nothing {
    if (!section.actions.length && !section.empty && !section.emptyKey) {
      return nothing;
    }

    return html`
      <h3 class="section-header">
        ${this._localizeValue(section.title, section.titleKey)}
      </h3>
      ${section.actions.length
        ? html`<ha-list-base>
            ${section.actions.map((action) => this._renderActionItem(action))}
          </ha-list-base>`
        : html`<h4 class="empty">
            ${this._localizeValue(section.empty, section.emptyKey)}
          </h4>`}
    `;
  }

  private _renderActionItem(action: AddToActionListItem): TemplateResult {
    return html`
      <ha-list-item-button
        .disabled=${action.enabled === false}
        .action=${action}
        .headline=${this._localizeValue(action.name, action.nameKey)}
        .supportingText=${this._localizeValue(
          action.description,
          action.descriptionKey
        )}
        @click=${this._actionSelected}
      >
        ${action.icon
          ? html`<ha-icon slot="start" .icon=${action.icon}></ha-icon>`
          : action.iconPath
            ? html`<ha-svg-icon
                slot="start"
                .path=${action.iconPath}
              ></ha-svg-icon>`
            : nothing}
      </ha-list-item-button>
    `;
  }

  private _localizeValue(
    value?: string,
    localizeKey?: LocalizeKeys
  ): string | undefined {
    return value ?? (localizeKey ? this._localize(localizeKey) : undefined);
  }

  private _actionSelected(
    ev: HASSDomCurrentTargetEvent<AddToActionListItemButton>
  ): void {
    if (ev.currentTarget.action.enabled === false) {
      return;
    }

    fireEvent(this, "add-to-list-action-selected", {
      action: ev.currentTarget.action,
    });
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    .section-header {
      padding: var(--ha-space-2) var(--ha-space-4) 0;
      margin: 0;
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      color: var(--secondary-text-color);
    }

    .empty {
      padding: var(--ha-space-2) var(--ha-space-4) 0;
      margin: 0;
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-normal);
      color: var(--secondary-text-color);
    }

    ha-icon,
    ha-svg-icon {
      display: flex;
      align-items: center;
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
