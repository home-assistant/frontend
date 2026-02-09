import { html, nothing } from "lit";
import { differenceInDays } from "date-fns";
import { mdiPencilOff } from "@mdi/js";
import type { HomeAssistant } from "../../../types";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { DataTableColumnData } from "../../../components/data-table/ha-data-table";
import { slugify } from "../../../common/string/slugify";
import { relativeTime } from "../../../common/datetime/relative_time";
import { formatShortDateTimeWithConditionalYear } from "../../../common/datetime/format_date_time";
import { isUnavailableState } from "../../../data/entity/entity";
import "../../../components/ha-tooltip";
import "../../../components/ha-svg-icon";

export function getEntityIdHiddenTableColumn<T>(): DataTableColumnData<T> {
  return {
    title: "",
    hidden: true,
    filterable: true,
  };
}

export function getEntityIdTableColumn<T>(
  localize: LocalizeFunc,
  defaultHidden?: boolean
): DataTableColumnData<T> {
  return {
    title: localize("ui.panel.config.generic.headers.entity_id"),
    defaultHidden: defaultHidden,
    filterable: true,
    sortable: true,
  };
}

export function getDomainTableColumn<T>(
  localize: LocalizeFunc
): DataTableColumnData<T> {
  return {
    title: localize("ui.panel.config.generic.headers.domain"),
    hidden: true,
    groupable: true,
    filterable: true,
    sortable: false,
  };
}

export function getAreaTableColumn<T>(
  localize: LocalizeFunc
): DataTableColumnData<T> {
  return {
    title: localize("ui.panel.config.generic.headers.area"),
    groupable: true,
    filterable: true,
    sortable: true,
    minWidth: "120px",
  };
}

export function getFloorTableColumn<T>(
  localize: LocalizeFunc
): DataTableColumnData<T> {
  return {
    title: localize("ui.panel.config.generic.headers.floor"),
    defaultHidden: true,
    groupable: true,
    filterable: true,
    sortable: true,
    minWidth: "120px",
  };
}

export function getCategoryTableColumn<T>(
  localize: LocalizeFunc
): DataTableColumnData<T> {
  return {
    title: localize("ui.panel.config.generic.headers.category"),
    defaultHidden: true,
    groupable: true,
    filterable: true,
    sortable: true,
  };
}

export function getEditableTableColumn<T>(
  localize: LocalizeFunc,
  tooltip: string
): DataTableColumnData<T> {
  return {
    title: localize("ui.panel.config.generic.headers.editable"),
    type: "icon",
    showNarrow: true,
    sortable: true,
    minWidth: "88px",
    maxWidth: "88px",
    template: (entry: any) => html`
      ${!entry.editable
        ? html`
            <ha-svg-icon
              .id="icon-edit-${slugify(entry.entity_id)}"
              .path=${mdiPencilOff}
              style="color: var(--secondary-text-color)"
            ></ha-svg-icon>
            <ha-tooltip
              .for="icon-edit-${slugify(entry.entity_id)}"
              placement="left"
            >
              ${tooltip}
            </ha-tooltip>
          `
        : nothing}
    `,
  };
}

export function getLabelsTableColumn<T>(): DataTableColumnData<T> {
  return {
    title: "",
    hidden: true,
    filterable: true,
    template: (entry: any) =>
      entry.label_entries.map((lbl) => lbl.name).join(" "),
  };
}

export function getTriggeredAtTableColumn<T>(
  localize: LocalizeFunc,
  hass: HomeAssistant
): DataTableColumnData<T> {
  return {
    title: localize("ui.card.automation.last_triggered"),
    sortable: true,
    template: (entry: any) =>
      renderRelativeTimeColumn(
        entry.last_triggered,
        "last-triggered",
        entry.entity_id,
        localize,
        hass
      ),
  };
}

export const renderRelativeTimeColumn = (
  valueRelativeTime: string,
  valueName: string,
  entity_id: string,
  localize: LocalizeFunc,
  hass: HomeAssistant
) => {
  if (!valueRelativeTime || isUnavailableState(valueRelativeTime)) {
    return localize("ui.components.relative_time.never");
  }
  const date = new Date(valueRelativeTime);
  const now = new Date();
  const dayDifference = differenceInDays(now, date);
  const formattedTime = formatShortDateTimeWithConditionalYear(
    date,
    hass.locale,
    hass.config
  );
  const elementId = valueName + "-" + slugify(entity_id);
  return html`
    ${dayDifference > 3
      ? formattedTime
      : html`
          <ha-tooltip for=${elementId}>${formattedTime}</ha-tooltip>
          <span id=${elementId}>${relativeTime(date, hass.locale)}</span>
        `}
  `;
};

export function getCreatedAtTableColumn<T>(
  localize: LocalizeFunc,
  hass: HomeAssistant
): DataTableColumnData<T> {
  return {
    title: localize("ui.panel.config.generic.headers.created_at"),
    defaultHidden: true,
    sortable: true,
    minWidth: "128px",
    template: (entry: any) => renderDateTimeColumn(entry.created_at, hass),
  };
}

export function getModifiedAtTableColumn<T>(
  localize: LocalizeFunc,
  hass: HomeAssistant
): DataTableColumnData<T> {
  return {
    title: localize("ui.panel.config.generic.headers.modified_at"),
    defaultHidden: true,
    sortable: true,
    minWidth: "128px",
    template: (entry: any) => renderDateTimeColumn(entry.modified_at, hass),
  };
}

const renderDateTimeColumn = (valueDateTime: number, hass: HomeAssistant) =>
  html`${valueDateTime
    ? formatShortDateTimeWithConditionalYear(
        new Date(valueDateTime * 1000),
        hass.locale,
        hass.config
      )
    : nothing}`;
