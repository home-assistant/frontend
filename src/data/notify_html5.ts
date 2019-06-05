import { HomeAssistant } from "../types";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const getAppKey = async (hass: HomeAssistant) => {
  const res = await hass.callWS<string>({
    type: "notify/html5/appkey",
  });
  return res ? urlBase64ToUint8Array(res) : null;
};
