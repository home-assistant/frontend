export default function createErrorConfig(error, origConfig) {
  return {
    type: 'error',
    error,
    origConfig,
  };
}
