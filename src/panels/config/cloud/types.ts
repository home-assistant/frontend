export interface EntityFilter {
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
  google_entities: EntityFilter;
  google_domains: string[];
  alexa_entities: EntityFilter;
  alexa_domains: string[];
  prefs: {
    google_enabled: boolean;
    alexa_enabled: boolean;
    google_allow_unlock: boolean;
  };
};

export type CloudStatus = CloudStatusBase | CloudStatusLoggedIn;

export interface SubscriptionInfo {
  human_description: string;
}
