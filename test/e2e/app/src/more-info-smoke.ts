import type { MoreInfoView } from "../../../../src/dialogs/more-info/const";
import type { ViewElementSmokeCase } from "../helpers";

export const moreInfoViewElements: ViewElementSmokeCase<MoreInfoView>[] = [
  {
    view: "info",
    element: "ha-more-info-info",
    content: [
      { selector: "more-info-light" },
      { selector: "span.title", text: "Test Light" },
    ],
  },
  {
    view: "history",
    element: "ha-more-info-history-and-logbook",
    // The demo loads the history component but not logbook.
    content: [{ selector: "ha-more-info-history" }],
  },
  {
    view: "settings",
    element: "ha-more-info-settings",
    // The scenario mocks config/entity_registry/get, so the real registry
    // panel renders instead of the "no unique ID" warning.
    content: [{ selector: "entity-registry-settings" }],
  },
  {
    view: "related",
    element: "ha-related-items",
    // search/related is mocked to return no relations, so the empty list
    // renders.
    content: [{ selector: "ha-related-items >> ha-list" }],
  },
  {
    view: "add_to",
    element: "ha-more-info-add-to",
    // Admin users get the default add-to action list.
    content: [{ selector: "ha-add-to-action-list" }],
  },
  {
    view: "details",
    element: "ha-more-info-details",
    // The details view renders the state and attributes cards.
    content: [{ selector: "ha-card" }],
  },
];
