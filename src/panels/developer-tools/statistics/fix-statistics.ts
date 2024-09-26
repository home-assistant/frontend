import { html } from "lit";
import {
  clearStatistics,
  getStatisticLabel,
  StatisticsValidationResult,
} from "../../../data/recorder";
import { documentationUrl } from "../../../util/documentation-url";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../lovelace/custom-card-helpers";
import { showFixStatisticsUnitsChangedDialog } from "./show-dialog-statistics-fix-units-changed";
import { LocalizeFunc } from "../../../common/translations/localize";
import { HomeAssistant } from "../../../types";

export const fixStatisticsIssue = async (
  element: HTMLElement,
  hass: HomeAssistant,
  localize: LocalizeFunc,
  issue: StatisticsValidationResult
) => {
  switch (issue.type) {
    case "no_state":
      return showConfirmationDialog(element, {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.no_state.title"
        ),
        text: html`${localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.no_state.info_text_1",
            {
              name: getStatisticLabel(hass, issue.data.statistic_id, undefined),
              statistic_id: issue.data.statistic_id,
            }
          )}<br /><br />${localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.no_state.info_text_2",
            { statistic_id: issue.data.statistic_id }
          )}`,
        confirmText: localize("ui.common.delete"),
        destructive: true,
        confirm: async () => {
          await clearStatistics(hass, [issue.data.statistic_id]);
        },
      });
    case "entity_not_recorded":
      return showAlertDialog(element, {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_not_recorded.title"
        ),
        text: html`${localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_not_recorded.info_text_1",
            {
              name: getStatisticLabel(hass, issue.data.statistic_id, undefined),
            }
          )}<br /><br />${localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_not_recorded.info_text_2"
          )}<br /><br />
          <a
            href=${documentationUrl(
              hass,
              "/integrations/recorder/#configure-filter"
            )}
            target="_blank"
            rel="noreferrer noopener"
          >
            ${localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_not_recorded.info_text_3_link"
            )}</a
          >`,
      });
    case "entity_no_longer_recorded":
      return showConfirmationDialog(element, {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.title"
        ),
        text: html`${localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.info_text_1",
            {
              name: getStatisticLabel(hass, issue.data.statistic_id, undefined),
              statistic_id: issue.data.statistic_id,
            }
          )}
          ${localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.info_text_2"
          )}
          <a
            href=${documentationUrl(
              hass,
              "/integrations/recorder/#configure-filter"
            )}
            target="_blank"
            rel="noreferrer noopener"
          >
            ${localize(
              "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.info_text_3_link"
            )}</a
          ><br /><br />
          ${localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.entity_no_longer_recorded.info_text_4"
          )}`,
        confirmText: localize("ui.common.delete"),
        destructive: true,
        confirm: async () => {
          await clearStatistics(hass, [issue.data.statistic_id]);
        },
      });
    case "unsupported_state_class":
      return showConfirmationDialog(element, {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.title"
        ),
        text: html`${localize(
            issue.data.state_class
              ? "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_1"
              : "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_1_no_state_class",
            {
              name: getStatisticLabel(hass, issue.data.statistic_id, undefined),
              statistic_id: issue.data.statistic_id,
              state_class: issue.data.state_class,
            }
          )}<br /><br />
          ${localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_2"
          )}
          <ul>
            <li>
              ${localize(
                "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_3"
              )}
            </li>
            <li>
              ${localize(
                "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_4"
              )}
              <a
                href="https://developers.home-assistant.io/docs/core/entity/sensor/#long-term-statistics"
                target="_blank"
                rel="noreferrer noopener"
              >
                ${localize(
                  "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_4_link"
                )}</a
              >
            </li>
            <li>
              ${localize(
                "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_5"
              )}
            </li>
          </ul>
          ${localize(
            "ui.panel.developer-tools.tabs.statistics.fix_issue.unsupported_state_class.info_text_6",
            { statistic_id: issue.data.statistic_id }
          )}`,
        confirmText: localize("ui.common.delete"),
        destructive: true,
        confirm: async () => {
          await clearStatistics(hass, [issue.data.statistic_id]);
        },
      });
    case "units_changed":
      return showFixStatisticsUnitsChangedDialog(element, {
        issue,
      });
    default:
      return showAlertDialog(element, {
        title: localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.no_support.title"
        ),
        text: localize(
          "ui.panel.developer-tools.tabs.statistics.fix_issue.no_support.info_text_1"
        ),
      });
  }
};
