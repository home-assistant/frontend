import { HomeAssistant } from "../../../types";

export const getCardConfig = (hass: HomeAssistant, cardId: string) =>
  hass.callWS({
    type: "lovelace/config/card/get",
    card_id: cardId,
  });
