import type { InfraredCommand } from "../../../../../src/data/infrared";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";
import { INFRARED_COMMAND_NAMES } from "./fixtures";

// Pronto codes for buttons of one NEC remote. The first three seed the known
// commands; the rest are what a recording session picks up, so recording twice
// in a row does not produce the same command.
const CODES = [
  "0000 006d 0022 0000 0156 00ac 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 02f9",
  "0000 006d 0022 0000 0156 00ac 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 02f9",
  "0000 006d 0022 0000 0156 00ac 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0017 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0041 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 02f9",
  "0000 006d 0022 0000 0156 00ac 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0017 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 02f9",
  "0000 006d 0022 0000 0156 00ac 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0041 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 02f9",
];

const slugify = (name: string) => name.toLowerCase().replace(/ /g, "_");

// The known command database, seeded with the commands the fixtures build the
// receiver's event entity from.
const commands: InfraredCommand[] = INFRARED_COMMAND_NAMES.map(
  (name, index) => ({ id: slugify(name), name, code: CODES[index] })
);

interface CommandChange {
  change_type: "added" | "updated" | "removed";
  command_id: string;
  item: InfraredCommand;
}

const subscribers = new Set<(changes: CommandChange[]) => void>();

const notify = (change: CommandChange) =>
  subscribers.forEach((subscriber) => subscriber([change]));

// A recording session replays the codes that are not in the database yet, then
// the known ones, so both a new command and a repeat can be seen.
const REPLAY_CODES = [...CODES.slice(3), ...CODES.slice(0, 3)];

let nextCode = 0;

export const mockInfrared = (hass: MockHomeAssistant) => {
  hass.mockWS("infrared/commands/list", () => commands);

  hass.mockWS(
    "infrared/commands/create",
    (msg: { name: string; code: string }) => {
      const item: InfraredCommand = {
        id: slugify(msg.name),
        name: msg.name,
        code: msg.code,
      };
      commands.push(item);
      notify({ change_type: "added", command_id: item.id, item });
      return item;
    }
  );

  hass.mockWS(
    "infrared/commands/update",
    (msg: { command_id: string; name: string }) => {
      const item = commands.find((command) => command.id === msg.command_id)!;
      item.name = msg.name;
      notify({ change_type: "updated", command_id: item.id, item });
      return item;
    }
  );

  hass.mockWS("infrared/commands/delete", (msg: { command_id: string }) => {
    const index = commands.findIndex(
      (command) => command.id === msg.command_id
    );
    const [item] = commands.splice(index, 1);
    notify({ change_type: "removed", command_id: item.id, item });
    return null;
  });

  hass.mockWS(
    "infrared/commands/subscribe",
    (_msg, _hass, onChange?: (changes: CommandChange[]) => void) => {
      const subscriber = onChange!;
      onChange?.(
        commands.map((item) => ({
          change_type: "added" as const,
          command_id: item.id,
          item,
        }))
      );
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    }
  );

  // Recording waits for a button press, so answer after a moment to let the
  // "press a button on your remote" state be seen.
  hass.mockWS("infrared/receiver/subscribe", (_msg, _hass, onChange) => {
    const timeout = window.setTimeout(() => {
      const code = REPLAY_CODES[nextCode % REPLAY_CODES.length];
      nextCode += 1;
      // The demo replays fixed codes, so comparing them is enough to stand in
      // for the timing comparison the backend does.
      onChange?.({
        code,
        duplicate_of:
          commands.find((command) => command.code === code)?.id ?? null,
      });
    }, 1500);
    return () => clearTimeout(timeout);
  });
};
