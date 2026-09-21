import type { HomeAssistant } from "../types";

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
  string | number | boolean | null | SystemCheckValueObject;

export type SystemHealthInfo = Partial<{
  homeassistant: {
    info: {
      version: string;
      installation_type: string;
      dev: boolean;
      hassio: boolean;
      docker: boolean;
      container_arch: string | null;
      user: string | null;
      virtualenv: boolean;
      python_version: string;
      os_name: string;
      os_version: string;
      arch: string;
      timezone: string;
      config_dir: string;
    };
  };
  [domain: string]: {
    manage_url?: string;
    info: Record<string, SystemCheckValue>;
  };
}>;

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
  error: SystemCheckValueErrorObject;
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
              : updateEvent.error,
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
