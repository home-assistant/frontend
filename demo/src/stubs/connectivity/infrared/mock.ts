import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";

// Pronto codes for three buttons of one NEC remote, so capturing twice in a
// row does not produce the same command.
const CODES = [
  "0000 006d 0022 0000 0156 00ac 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 02f9",
  "0000 006d 0022 0000 0156 00ac 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 02f9",
  "0000 006d 0022 0000 0156 00ac 0015 0041 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 0017 0015 0041 0015 0017 0015 0041 0015 0017 0015 0041 0015 0041 0015 0041 0015 0041 0015 0017 0015 0041 0015 0017 0015 0041 0015 0017 0015 0017 0015 0017 0015 0017 0015 02f9",
];

let nextCode = 0;

export const mockInfrared = (hass: MockHomeAssistant) => {
  // Capturing waits for a button press, so answer after a moment to let the
  // "press a button on your remote" state be seen.
  hass.mockWS(
    "infrared/receiver/subscribe",
    (msg: { known_codes?: string[] }, _hass, onChange) => {
      const timeout = window.setTimeout(() => {
        const code = CODES[nextCode % CODES.length];
        nextCode += 1;
        // The demo replays fixed codes, so comparing them is enough to stand
        // in for the timing comparison the backend does.
        onChange?.({
          code,
          duplicate_of:
            msg.known_codes?.find((known) => known === code) ?? null,
        });
      }, 1500);
      return () => clearTimeout(timeout);
    }
  );
};
