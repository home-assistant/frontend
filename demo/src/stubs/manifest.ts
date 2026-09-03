import type { IntegrationManifest } from "../../../src/data/integration";

/**
 * Builds a demo integration manifest. Lives in its own module so both the
 * manifest registry and the per-integration fixtures that feed it can use it
 * without importing each other.
 */
export const manifest = (
  domain: string,
  name: string,
  overrides: Partial<IntegrationManifest> = {}
): IntegrationManifest => ({
  is_built_in: true,
  domain,
  name,
  config_flow: true,
  documentation: `https://www.home-assistant.io/integrations/${domain}/`,
  iot_class: "local_push",
  ...overrides,
});
