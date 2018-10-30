import { HomeAssistant } from "../../../types";

export const getCardConfig = (hass: HomeAssistant, cardId: string) =>
  hass.callWS({
    type: "lovelace/config/card/get",
    card_id: cardId,
  });

export const updateCardConfig = (
  hass: HomeAssistant,
  cardId: string,
  config: any
) =>
  hass!.callWS({
    type: "lovelace/config/card/update",
    card_id: cardId,
    card_config: config,
  });
