export function readVariantConfig(host) {
  try {
    const script = host.querySelector("script[data-owb-config]");
    return script ? JSON.parse(script.textContent || "{}") : {};
  } catch {
    return {};
  }
}

export const withVariantConfig = (Base) =>
  class extends Base {
    get config() {
      return readVariantConfig(this);
    }
  };
