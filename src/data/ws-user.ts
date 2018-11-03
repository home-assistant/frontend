import { createCollection, getUser } from "home-assistant-js-websocket";

export interface User {
  id: string;
  is_owner: boolean;
  name: string;
}

export const subscribeUser = (conn, onChange) =>
  createCollection<User>(
    "_usr",
    // the getUser command is mistyped in current verrsion of HAWS.
    // Fixed in 3.2.5
    () => (getUser(conn) as unknown) as Promise<User>,
    undefined,
    conn,
    onChange
  );
