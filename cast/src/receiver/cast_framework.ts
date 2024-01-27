import type { cast as ReceiverCast } from "chromecast-caf-receiver";

export const framework = (cast as unknown as typeof ReceiverCast).framework;
