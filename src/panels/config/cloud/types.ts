interface EntityFilter {
  include_domains: string[];
  include_entities: string[];
  exclude_domains: string[];
  exclude_entities: string[];
}
interface CloudStatusBase {
  logged_in: boolean;
  cloud: "disconnected" | "connecting" | "connected";
}

export type CloudStatusLoggedIn = CloudStatusBase & {
  email: string;
  google_enabled: boolean;
  google_entities: EntityFilter;
  alexa_enabled: boolean;
  alexa_entities: EntityFilter;
};

export type CloudStatus = CloudStatusBase | CloudStatusLoggedIn;

export interface SubscriptionInfo {
  human_description: string;
}
