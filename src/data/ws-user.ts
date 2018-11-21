import {
  createCollection,
  getUser,
  Connection,
} from "home-assistant-js-websocket";
import { User } from "../types";

export const subscribeUser = (
  conn: Connection,
  onChange: (user: User) => void
) =>
  createCollection<User>(
    "_usr",
    // the getUser command is mistyped in current verrsion of HAWS.
    // Fixed in 3.2.5
    () => (getUser(conn) as unknown) as Promise<User>,
    undefined,
    conn,
    onChange
  );
