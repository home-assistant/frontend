import {
  getUser,
  Connection,
  getCollection,
} from "home-assistant-js-websocket";
import { User } from "../types";

export const userCollection = (conn: Connection) =>
  getCollection(conn, "_usr", () => getUser(conn) as Promise<User>, undefined);

export const subscribeUser = (
  conn: Connection,
  onChange: (user: User) => void
) => userCollection(conn).subscribe(onChange);
