function readConfig(host) {
  const cached = host.getAttribute("data-owb-config-json");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Fall through to script parsing if cached value is invalid.
    }
  }

  try {
    const script = host.querySelector("script[data-owb-config]");
    if (!script) {
      return {};
    }

    const raw = script.textContent || "{}";
    host.setAttribute("data-owb-config-json", raw);
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function cacheInlineConfigsOnHosts() {
  const scripts = document.querySelectorAll("script[data-owb-config]");
  scripts.forEach((script) => {
    const parent = script.parentElement;
    if (!(parent instanceof HTMLElement)) {
      return;
    }

    if (!parent.tagName.toLowerCase().startsWith("owb-")) {
      return;
    }

    if (!parent.hasAttribute("data-owb-config-json")) {
      parent.setAttribute("data-owb-config-json", script.textContent || "{}");
    }
  });
}

cacheInlineConfigsOnHosts();

function getSpacingCss(settings) {
  const props = [
    ["padding-top", settings.settingSpacingPaddingTop],
    ["padding-right", settings.settingSpacingPaddingRight],
    ["padding-bottom", settings.settingSpacingPaddingBottom],
    ["padding-left", settings.settingSpacingPaddingLeft],
    ["margin-top", settings.settingSpacingMarginTop],
    ["margin-right", settings.settingSpacingMarginRight],
    ["margin-bottom", settings.settingSpacingMarginBottom],
    ["margin-left", settings.settingSpacingMarginLeft],
    ["border-radius", settings.settingSpacingBorderRadius],
  ];
  const parts = props
    .filter(([, v]) => String(v || "").trim())
    .map(([p, v]) => `${p}: ${v}`);

  if (settings.settingSpacingBackgroundColor) {
    parts.push(
      `background-color: var(${settings.settingSpacingBackgroundColor})`,
    );
  }
  if (settings.settingSpacingTextColor) {
    parts.push(`color: var(${settings.settingSpacingTextColor})`);
  }
  if (settings.settingSpacingHidden) {
    parts.push("display: none !important");
  }

  return parts.length ? `:host { ${parts.join("; ")} }` : "";
}

function buildResponsiveSpacingCss(settings) {
  const overrides = settings.responsiveOverrides;
  if (!overrides || typeof overrides !== "object") return "";
  const rules = RESPONSIVE_BREAKPOINTS.map(({ bucket, maxWidth }) => {
    const bucketOverrides = overrides[bucket];
    if (!bucketOverrides || typeof bucketOverrides !== "object") return "";
    const merged = { ...settings, ...bucketOverrides };
    const css = getSpacingCss(merged);
    if (!css) return "";
    // Wrap each property declaration with !important so it overrides the base :host rule
    const important = css.replace(/:host \{([^}]+)\}/, (_, decls) => {
      const importantDecls = decls
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => `${d} !important`)
        .join("; ");
      return `@media (max-width: ${maxWidth}px) { :host { ${importantDecls} } }`;
    });
    return important;
  })
    .filter(Boolean)
    .join("\n");
  return rules;
}

function renderShadow(host, markup, cssHref) {
  const root = host.shadowRoot || host.attachShadow({ mode: "open" });
  const raw = readConfig(host);
  const settings = raw.settings ?? raw;
  const spacingCss = getSpacingCss(settings);
  const responsiveSpacingCss = buildResponsiveSpacingCss(settings);
  const combinedSpacing = [spacingCss, responsiveSpacingCss]
    .filter(Boolean)
    .join("\n");
  const linkTag = cssHref ? `<link rel="stylesheet" href="${cssHref}" />` : "";
  root.innerHTML = `${linkTag}${combinedSpacing ? `<style data-spacing>${combinedSpacing}</style>` : ""}${markup}`;
  return root;
}

function sanitizeEmbed(rawHtml) {
  const html = String(rawHtml ?? "");
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(?:href|src)\s*=\s*"\s*javascript:[^"]*"/gi, "")
    .replace(/\s(?:href|src)\s*=\s*'\s*javascript:[^']*'/gi, "")
    .replace(/\ssrcdoc\s*=\s*"[^"]*"/gi, "")
    .replace(/\ssrcdoc\s*=\s*'[^']*'/gi, "");
}

function normalizeTextLinksToSameTab(rawHtml) {
  const html = String(rawHtml ?? "");
  const template = document.createElement("template");
  template.innerHTML = html;

  const anchors = template.content.querySelectorAll("a");
  anchors.forEach((anchor) => {
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
  });

  return template.innerHTML;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function getSocialButtonShapeRadius(shape, customRadius) {
  if (shape === "rounded") {
    return "9999px";
  }

  if (shape === "square") {
    return "0px";
  }

  return customRadius || "12px";
}

function getSectionPadding(settings) {
  const presets = {
    none: { top: "0", right: "0", bottom: "0", left: "0" },
    small: { top: "2rem", right: "2rem", bottom: "2rem", left: "2rem" },
    medium: { top: "5rem", right: "2rem", bottom: "5rem", left: "2rem" },
    large: { top: "8rem", right: "2rem", bottom: "8rem", left: "2rem" },
  };

  const preset = presets[settings.settingSizing] || presets.medium;
  return {
    top: String(settings.settingPaddingTop || preset.top),
    right: String(settings.settingPaddingRight || preset.right),
    bottom: String(settings.settingPaddingBottom || preset.bottom),
    left: String(settings.settingPaddingLeft || preset.left),
  };
}

function getSectionStyle(settings) {
  const parts = [];
  if (settings.settingBackgroundColor) {
    parts.push(`background-color: var(${settings.settingBackgroundColor})`);
    parts.push(
      `--owb-section-child-background-color: var(${settings.settingBackgroundColor})`,
    );
  }
  if (settings.settingTextColor) {
    parts.push(`color: var(${settings.settingTextColor})`);
    parts.push(
      `--owb-section-child-text-color: var(${settings.settingTextColor})`,
    );
  }
  return parts.join("; ");
}

// Ordered widest-first so cascade works correctly.
// mobileHorizontal (844) comes before tabletVertical (820) because 844 > 820.
const RESPONSIVE_BREAKPOINTS = [
  { bucket: "tabletHorizontal", maxWidth: 1180 },
  { bucket: "mobileHorizontal", maxWidth: 844 },
  { bucket: "tabletVertical", maxWidth: 820 },
  { bucket: "mobileVertical", maxWidth: 390 },
];

// Builds media query CSS to embed inside a shadow DOM style block.
// Uses !important so the media query rules override the inline styles already
// on the section/container elements within the shadow DOM.
function buildResponsiveSectionCss(
  settings,
  sectionSelector,
  containerSelector,
) {
  const overrides = settings.responsiveOverrides;
  if (!overrides || typeof overrides !== "object") return "";

  const rules = RESPONSIVE_BREAKPOINTS.map(({ bucket, maxWidth }) => {
    const bucketOverrides = overrides[bucket];
    if (
      !bucketOverrides ||
      typeof bucketOverrides !== "object" ||
      Object.keys(bucketOverrides).length === 0
    ) {
      return "";
    }
    const merged = { ...settings, ...bucketOverrides };
    const sectionCss = getSectionStyle(merged)
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `${p} !important`)
      .join("; ");
    const containerCss = getSectionContainerStyle(merged)
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `${p} !important`)
      .join("; ");
    const parts = [];
    if (sectionCss)
      parts.push(
        `@media (max-width: ${maxWidth}px) { ${sectionSelector} { ${sectionCss} } }`,
      );
    if (containerCss)
      parts.push(
        `@media (max-width: ${maxWidth}px) { ${containerSelector} { ${containerCss} } }`,
      );
    return parts.join(" ");
  })
    .filter(Boolean)
    .join("\n");

  return rules;
}

function getSectionContainerStyle(settings) {
  const parts = [];
  const mode = String(settings.settingAlignmentMode || "block");
  const width = String(settings.settingWidth || "normal");
  const customWidth = String(settings.settingWidthCustomValue || "").trim();

  if (width === "custom" && customWidth) {
    parts.push(`max-width: ${customWidth}`);
  }

  if (mode === "flex") {
    parts.push("display: flex");
    parts.push(
      `flex-direction: ${String(settings.settingFlexDirection || "row")}`,
    );
    parts.push(
      `justify-content: ${String(settings.settingFlexJustifyContent || "flex-start")}`,
    );
    parts.push(
      `align-items: ${String(settings.settingFlexAlignItems || "flex-start")}`,
    );
    if (settings.settingGap) {
      parts.push(`gap: ${String(settings.settingGap)}`);
    }
  }

  if (mode === "grid" || mode === "visual") {
    const columns = Math.max(
      1,
      Number.parseInt(settings.settingGridColumns, 10) || 2,
    );
    const rows = Math.max(
      1,
      Number.parseInt(settings.settingGridRows, 10) || 2,
    );
    parts.push("display: grid");
    parts.push(`grid-template-columns: repeat(${columns}, minmax(0, 1fr))`);
    if (mode === "visual") {
      const rowSize = String(settings.settingRowHeight || "30px").trim();
      parts.push(`grid-template-rows: repeat(${rows}, ${rowSize})`);
    } else {
      parts.push(`grid-template-rows: repeat(${rows}, auto)`);
    }
    if (settings.settingGap) {
      parts.push(`gap: ${String(settings.settingGap)}`);
    }
    if (mode === "visual") {
      parts.push("justify-items: stretch");
      parts.push("align-items: stretch");
      parts.push("justify-content: stretch");
      parts.push("align-content: stretch");
    } else {
      if (settings.settingGridJustifyContent) {
        parts.push(`justify-content: ${settings.settingGridJustifyContent}`);
      }
      if (settings.settingGridAlignItems) {
        parts.push(`align-items: ${settings.settingGridAlignItems}`);
      }
      if (settings.settingGridAlignContent) {
        parts.push(`align-content: ${settings.settingGridAlignContent}`);
      }
    }
  }

  const padding = getSectionPadding(settings);
  parts.push(`padding-top: ${padding.top}`);
  parts.push(`padding-right: ${padding.right}`);
  parts.push(`padding-bottom: ${padding.bottom}`);
  parts.push(`padding-left: ${padding.left}`);

  if (settings.settingFixedHeight && mode !== "visual") {
    parts.push(`min-height: ${String(settings.settingFixedHeight)}`);
  }

  return parts.join("; ");
}

class OwbInput extends HTMLElement {
  connectedCallback() {
    const settings = readConfig(this);
    const fieldType = String(settings.fieldType || "text");
    const label = String(settings.label || "");
    const name = String(settings.name || "").trim();
    const required =
      settings.required === true || String(settings.required || "") === "true";
    const placeholder = String(settings.placeholder || "").trim();
    const min = String(settings.min || "").trim();
    const max = String(settings.max || "").trim();
    const step = String(settings.step || "").trim();
    const rows = Number.parseInt(settings.rows, 10);
    const minLength = String(settings.minLength || "").trim();
    const maxLength = String(settings.maxLength || "").trim();
    const pattern = String(settings.pattern || "").trim();

    this.textContent = "";

    const wrapper = document.createElement("div");
    wrapper.className = "form-input-block";

    if (label) {
      const labelEl = document.createElement("label");
      labelEl.className = "form-input-label";
      labelEl.textContent = required ? `${label} *` : label;
      wrapper.appendChild(labelEl);
    }

    const control =
      fieldType === "textarea"
        ? document.createElement("textarea")
        : document.createElement("input");
    control.className =
      control instanceof HTMLTextAreaElement
        ? "form-input-textarea"
        : "form-input-field";

    if (control instanceof HTMLInputElement) {
      control.type = fieldType === "number" ? "number" : "text";
    }

    if (control instanceof HTMLTextAreaElement) {
      control.rows = Number.isNaN(rows) || rows < 1 ? 4 : rows;
    }

    if (name) {
      control.name = name;
    }
    if (required) {
      control.required = true;
    }
    if (placeholder) {
      control.placeholder = placeholder;
    }
    if (min && "min" in control) {
      control.setAttribute("min", min);
    }
    if (max && "max" in control) {
      control.setAttribute("max", max);
    }
    if (step && control instanceof HTMLInputElement) {
      control.step = step;
    }
    if (minLength && "minLength" in control) {
      control.setAttribute("minlength", minLength);
    }
    if (maxLength && "maxLength" in control) {
      control.setAttribute("maxlength", maxLength);
    }
    if (pattern && control instanceof HTMLInputElement) {
      control.pattern = pattern;
    }

    wrapper.appendChild(control);
    this.append(wrapper);
  }
}

class OwbCaptcha extends HTMLElement {
  connectedCallback() {
    const config = readConfig(this);
    const challengeUrl = String(config.settingCaptchaChallengeUrl || "").trim();

    if (!challengeUrl) {
      return;
    }

    if (!document.querySelector("script[data-altcha-script]")) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/gh/altcha-org/altcha/dist/altcha.min.js";
      script.type = "module";
      script.async = true;
      script.defer = true;
      script.setAttribute("data-altcha-script", "");
      document.head.appendChild(script);
    }

    const widget = document.createElement("altcha-widget");
    widget.setAttribute("challengeurl", challengeUrl);
    this.appendChild(widget);
  }
}

class OwbCheckbox extends HTMLElement {
  connectedCallback() {
    const config = readConfig(this);
    const label = String(config.checkboxLabel || "").trim();
    const name = String(config.checkboxName || "").trim();
    const value = String(config.checkboxValue || "").trim();
    const defaultChecked =
      config.checkboxDefaultChecked === true ||
      String(config.checkboxDefaultChecked || "") === "true";
    const required =
      config.checkboxRequired === true ||
      String(config.checkboxRequired || "") === "true";

    const uid = `owb-cb-${Math.random().toString(36).slice(2, 9)}`;

    this.textContent = "";

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      :host { display: block; }
      .owb-checkbox-block { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 0.95rem; cursor: pointer; }
      .owb-checkbox-block input[type="checkbox"] { width: 16px; height: 16px; flex-shrink: 0; cursor: pointer; }
    `;

    const labelEl = document.createElement("label");
    labelEl.className = "owb-checkbox-block";
    labelEl.setAttribute("for", uid);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = uid;
    if (name) input.name = name;
    if (value) input.value = value;
    if (defaultChecked) input.checked = true;
    if (required) input.required = true;

    const span = document.createElement("span");
    span.textContent = label;

    if (required) {
      const asterisk = document.createElement("span");
      asterisk.style.color = "#b42318";
      asterisk.style.marginLeft = "2px";
      asterisk.textContent = "*";
      span.appendChild(asterisk);
    }

    labelEl.appendChild(input);
    labelEl.appendChild(span);
    this.append(styleEl, labelEl);
  }
}

class OwbCollectionContent extends HTMLElement {
  connectedCallback() {
    // Marker component: publish output already injects its children where needed.
  }
}

if (!customElements.get("owb-input")) {
  customElements.define("owb-input", OwbInput);
}
if (!customElements.get("owb-captcha")) {
  customElements.define("owb-captcha", OwbCaptcha);
}
if (!customElements.get("owb-checkbox")) {
  customElements.define("owb-checkbox", OwbCheckbox);
}
if (!customElements.get("owb-collection-content")) {
  customElements.define("owb-collection-content", OwbCollectionContent);
}
