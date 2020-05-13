// From https://gist.githubusercontent.com/tiernan/c18a380935e45a6d942ac1e88c5bbaf3/raw/1d103eb5882504505ccc84cbc9398ac20418ef8a/serviceworker.d.ts
/**
 * Copyright (c) 2018, Tiernan Cridland
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby
 * granted, provided that the above copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER
 * IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 *
 * Service Worker Typings to supplement lib.webworker.ts
 * @author Tiernan Cridland
 * @email tiernanc@gmail.com
 * @license: ISC
 *
 * lib.webworker.d.ts as well as an es5+ library (es5, es2015, etc) are required.
 * Recommended to be used with a triple slash directive in the files requiring the typings only.
 * e.g. your-service-worker.js, register-service-worker.js
 * e.g. /// <reference path="path/to/serviceworker.d.ts" />
 */
/* eslint-disable */
// Registration

interface WorkerNavigator {
  readonly serviceWorker: ServiceWorkerContainer;
}

interface ServiceWorkerContainer {
  readonly controller: ServiceWorker;
  readonly ready: Promise<ServiceWorkerRegistration>;
  oncontrollerchange:
    | ((this: ServiceWorkerContainer, event: Event) => any)
    | null;
  onerror: ((this: ServiceWorkerContainer, event?: Event) => any) | null;
  onmessage:
    | ((this: ServiceWorkerContainer, event: ServiceWorkerMessageEvent) => any)
    | null;
  getRegistration(scope?: string): Promise<ServiceWorkerRegistration>;
  getRegistrations(): Promise<ServiceWorkerRegistration[]>;
  register(
    url: string,
    options?: ServiceWorkerRegistrationOptions
  ): Promise<ServiceWorkerRegistration>;
}

interface ServiceWorkerMessageEvent extends Event {
  readonly data: any;
  readonly lastEventId: string;
  readonly origin: string;
  readonly ports: ReadonlyArray<MessagePort> | null;
  readonly source: ServiceWorker | MessagePort | null;
}

interface ServiceWorkerRegistrationOptions {
  scope?: string;
}

// Client API

interface Client {
  readonly frameType: ClientFrameType;
}

type ClientFrameType = "auxiliary" | "top-level" | "nested" | "none";

// Events

interface ActivateEvent extends ExtendableEvent {}

interface InstallEvent extends ExtendableEvent {
  readonly activeWorker: ServiceWorker;
}

// Fetch API

interface Body {
  readonly body: ReadableStream;
}

interface Headers {
  entries(): string[][];
  keys(): string[];
  values(): string[];
}

interface Response extends Body {
  readonly useFinalURL: boolean;
  clone(): Response;
  error(): Response;
  redirect(): Response;
}

// Notification API

interface Notification {
  readonly actions: NotificationAction[];
  readonly requireInteraction: boolean;
  readonly silent: boolean;
  readonly tag: string;
  readonly renotify: boolean;
  readonly timestamp: number;
  readonly title: string;
  readonly vibrate: number[];
  close(): void;
  requestPermission(): Promise<string>;
}

interface NotificationAction {}

// ServiceWorkerGlobalScope

declare var clients: Clients;
declare var onactivate: ((event?: ActivateEvent) => any) | null;
declare var onfetch: ((event?: FetchEvent) => any) | null;
declare var oninstall: ((event?: InstallEvent) => any) | null;
declare var onnotificationclick: ((event?: NotificationEvent) => any) | null;
declare var onnotificationclose: ((event?: NotificationEvent) => any) | null;
declare var onpush: ((event?: PushEvent) => any) | null;
declare var onpushsubscriptionchange: (() => any) | null;
declare var onsync: ((event?: SyncEvent) => any) | null;
declare var registration: ServiceWorkerRegistration;

declare function skipWaiting(): void;
