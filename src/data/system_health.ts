import { HomeAssistant } from "../types";

interface SystemCheckValueDateObject {
  type: "date";
  value: string;
}

interface SystemCheckValueErrorObject {
  type: "failed";
  error: string;
  more_info?: string;
}

interface SystemCheckValuePendingObject {
  type: "pending";
}

export type SystemCheckValueObject =
  | SystemCheckValueDateObject
  | SystemCheckValueErrorObject
  | SystemCheckValuePendingObject;

export type SystemCheckValue =
  | string
  | number
  | boolean
  | SystemCheckValueObject;

export interface SystemHealthInfo {
  [domain: string]: {
    manage_url?: string;
    info: {
      [key: string]: SystemCheckValue;
    };
  };
}

interface SystemHealthEventInitial {
  type: "initial";
  data: SystemHealthInfo;
}
interface SystemHealthEventUpdateSuccess {
  type: "update";
  success: true;
  domain: string;
  key: string;
  data: SystemCheckValue;
}

interface SystemHealthEventUpdateError {
  type: "update";
  success: false;
  domain: string;
  key: string;
  error: {
    msg: string;
  };
}

interface SystemHealthEventFinish {
  type: "finish";
}

type SystemHealthEvent =
  | SystemHealthEventInitial
  | SystemHealthEventUpdateSuccess
  | SystemHealthEventUpdateError
  | SystemHealthEventFinish;

export const subscribeSystemHealthInfo = (
  hass: HomeAssistant,
  callback: (info: SystemHealthInfo | undefined) => void
) => {
  let data = {};

  const unsubProm = hass.connection.subscribeMessage<SystemHealthEvent>(
    (updateEvent) => {
      if (updateEvent.type === "initial") {
        data = updateEvent.data;
        callback(data);
        return;
      }
      if (updateEvent.type === "finish") {
        unsubProm.then((unsub) => unsub());
        callback(undefined);
        return;
      }

      data = {
        ...data,
        [updateEvent.domain]: {
          ...data[updateEvent.domain],
          info: {
            ...data[updateEvent.domain].info,
            [updateEvent.key]: updateEvent.success
              ? updateEvent.data
              : {
                  error: true,
                  value: updateEvent.error.msg,
                },
          },
        },
      };
      callback(data);
    },
    {
      type: "system_health/info",
    }
  );

  return unsubProm;
};
