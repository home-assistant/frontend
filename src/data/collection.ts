import {
  Collection,
  Connection,
  getCollection,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";

interface OptimisticCollection<T> extends Collection<T> {
  save(data: T): Promise<unknown>;
}

/**
 * Create an optimistic collection that includes a save function.
 * When the collection is saved, the collection is optimistically updated.
 * The update is reversed when the update failed.
 */

export const getOptimisticCollection = <StateType>(
  saveCollection: (conn2: Connection, data: StateType) => Promise<unknown>,
  conn: Connection,
  key: string,
  fetchCollection: (conn2: Connection) => Promise<StateType>,
  subscribeUpdates?: (
    conn2: Connection,
    store: Store<StateType>
  ) => Promise<UnsubscribeFunc>
): OptimisticCollection<StateType> => {
  const updateKey = `${key}-optimistic`;

  const collection = getCollection<StateType>(
    conn,
    key,
    fetchCollection,
    async (_conn, store) => {
      // Subscribe to original updates
      const subUpResult = subscribeUpdates
        ? subscribeUpdates(conn, store)
        : undefined;
      // Store the store
      conn[updateKey] = store;

      // Unsub function to undo both
      return () => {
        if (subUpResult) {
          subUpResult.then((unsub) => unsub());
        }
        conn[updateKey] = undefined;
      };
    }
  );
  return {
    ...collection,
    async save(data: StateType) {
      const store: Store<StateType> | undefined = conn[updateKey];
      let current;

      // Can be undefined if currently no subscribers
      if (store) {
        current = store.state;
        store.setState(data, true);
      }

      try {
        return await saveCollection(conn, data);
      } catch (err: any) {
        if (store) {
          store.setState(current as any, true);
        }
        throw err;
      }
    },
  };
};
