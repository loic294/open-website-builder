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

const SHADOW_STYLESHEET_HREF = "./owb-components.css";

function renderShadow(host, markup) {
  const root = host.shadowRoot || host.attachShadow({ mode: "open" });
  root.innerHTML = `<link rel="stylesheet" href="${SHADOW_STYLESHEET_HREF}" />${markup}`;
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

function getSectionPadding(settings) {
  const presets = {
    none: { top: "0", right: "0", bottom: "0", left: "0" },
    small: { top: "2rem", right: "2rem", bottom: "2rem", left: "2rem" },
    medium: { top: "5rem", right: "2rem", bottom: "5rem", left: "2rem" },
    large: { top: "8rem", right: "2rem", bottom: "8rem", left: "2rem" },
  };

  const preset = presets[settings.settingSizing];
  if (preset) {
    return preset;
  }

  const fallback = presets.medium;
  return {
    top: String(settings.settingPaddingTop || fallback.top),
    right: String(settings.settingPaddingRight || fallback.right),
    bottom: String(settings.settingPaddingBottom || fallback.bottom),
    left: String(settings.settingPaddingLeft || fallback.left),
  };
}

function getSectionStyle(settings) {
  const parts = [];
  if (settings.settingBackgroundColor) {
    parts.push(`background-color: var(${settings.settingBackgroundColor})`);
  }
  if (settings.settingTextColor) {
    parts.push(`color: var(${settings.settingTextColor})`);
  }
  return parts.join("; ");
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

class OwbText extends HTMLElement {
  connectedCallback() {
    const { content = "", settings = {} } = readConfig(this);
    const customCss = String(settings.customCss || "").trim();
    renderShadow(
      this,
      `${customCss ? `<style>${customCss}</style>` : ""}<div class="text-block ProseMirror">${content}</div>`,
    );
  }
}

class OwbImage extends HTMLElement {
  connectedCallback() {
    const { url = "", settings = {} } = readConfig(this);
    const mode = String(settings.imageSizeMode || "contained");
    const customCss = String(settings.customCss || "").trim();
    const content = url
      ? `<div class="image-block size-${mode}"><div class="image-frame size-${mode}"><img src="${url}" alt="" loading="lazy" /></div></div>`
      : `<div class="image-block"><div class="image-frame"></div></div>`;
    renderShadow(
      this,
      `${customCss ? `<style>${customCss}</style>` : ""}${content}`,
    );
  }
}

class OwbButton extends HTMLElement {
  connectedCallback() {
    const { content = "Button", settings = {} } = readConfig(this);
    const link = String(settings.buttonLink || "").trim();
    const size = String(settings.buttonSize || "m");
    const theme = String(settings.buttonTheme || "primary");
    const variant = String(settings.buttonVariant || "filled");
    const shape = String(settings.buttonShape || "rounded");
    const customRadius = String(settings.buttonRadiusCustom || "12px");

    let sizeStyle =
      "--button-padding-y: 0.58rem; --button-padding-x: 1rem; --button-font-size: 0.95rem;";
    if (size === "xs") {
      sizeStyle =
        "--button-padding-y: 0.28rem; --button-padding-x: 0.65rem; --button-font-size: 0.78rem;";
    }
    if (size === "sm") {
      sizeStyle =
        "--button-padding-y: 0.4rem; --button-padding-x: 0.8rem; --button-font-size: 0.85rem;";
    }
    if (size === "l") {
      sizeStyle =
        "--button-padding-y: 0.72rem; --button-padding-x: 1.25rem; --button-font-size: 1.05rem;";
    }
    if (size === "xl") {
      sizeStyle =
        "--button-padding-y: 0.9rem; --button-padding-x: 1.5rem; --button-font-size: 1.15rem;";
    }

    if (size === "custom") {
      const top = settings.buttonPaddingTop || "0.58rem";
      const right = settings.buttonPaddingRight || "1rem";
      const bottom = settings.buttonPaddingBottom || "0.58rem";
      const left = settings.buttonPaddingLeft || "1rem";
      sizeStyle = `--button-padding-y: ${top}; --button-padding-x: ${right}; --button-font-size: 0.95rem; padding: ${top} ${right} ${bottom} ${left};`;
    }

    let radius = "9999px";
    if (shape === "square") {
      radius = "0px";
    }
    if (shape === "custom") {
      radius = customRadius || "12px";
    }

    renderShadow(
      this,
      `<div class="button-block"><div class="button-preview-wrap"><a class="site-button theme-${theme} variant-${variant}" href="${link || "#"}" style="${sizeStyle} --button-radius: ${radius};">${content}</a></div></div>`,
    );
  }
}

class OwbEmbed extends HTMLElement {
  connectedCallback() {
    const { html = "" } = readConfig(this);
    const safeHtml = sanitizeEmbed(html);
    renderShadow(
      this,
      safeHtml.trim()
        ? `<div class="embed-preview">${safeHtml}</div>`
        : `<div class="embed-placeholder">No embed content</div>`,
    );
  }
}

class OwbSocialMedia extends HTMLElement {
  connectedCallback() {
    const { items = [], settings = {} } = readConfig(this);
    if (!Array.isArray(items) || items.length === 0) {
      renderShadow(
        this,
        `<div class="social-empty">No social links configured</div>`,
      );
      return;
    }

    const size = String(settings.socialButtonSize || "medium");
    const theme = String(settings.socialButtonTheme || "primary");
    const variant = String(settings.socialButtonVariant || "filled");
    const shape = String(settings.socialButtonShape || "rounded");
    const customRadius = String(settings.socialButtonRadiusCustom || "9999px");
    const displayMode = String(settings.socialDisplayMode || "icon-text");
    const showIcon = displayMode !== "text";
    const showText = displayMode !== "icon";
    const radius =
      shape === "square" ? "0" : shape === "custom" ? customRadius : "9999px";

    const contentHtml = items
      .map((item) => {
        const label = String(item?.name || "Social");
        const href = String(item?.link || "").trim() || "#";
        const rawIcon = String(item?.icon || "").trim();
        const icon = rawIcon ? rawIcon.slice(0, 1).toUpperCase() : "S";
        return `<a class="social-button size-${size} theme-${theme} variant-${variant}" href="${href}" target="_blank" rel="noopener noreferrer" style="--social-button-radius: ${radius};">${showIcon ? `<span class="social-icon"><span class="social-fallback-icon">${icon}</span></span>` : ""}${showText ? `<span>${label}</span>` : ""}</a>`;
      })
      .join("");

    renderShadow(
      this,
      `<div class="social-block"><div class="social-buttons-grid">${contentHtml}</div></div>`,
    );
  }
}

class OwbGallery extends HTMLElement {
  constructor() {
    super();
    this.lightboxIndex = -1;
  }

  connectedCallback() {
    this.render();

    const root = this.shadowRoot;
    if (root) {
      root.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;

        const thumb = target.closest("[data-gallery-thumb-index]");
        if (thumb) {
          const index = Number.parseInt(
            thumb.getAttribute("data-gallery-thumb-index") || "-1",
            10,
          );
          this.openLightbox(index);
          return;
        }

        if (target.closest("[data-gallery-close]")) {
          this.closeLightbox();
          return;
        }

        if (target.closest("[data-gallery-prev]")) {
          this.navigate(-1);
          return;
        }

        if (target.closest("[data-gallery-next]")) {
          this.navigate(1);
        }
      });
    }

    window.addEventListener("keydown", (event) => {
      if (this.lightboxIndex < 0) return;
      if (event.key === "Escape") this.closeLightbox();
      if (event.key === "ArrowLeft") this.navigate(-1);
      if (event.key === "ArrowRight") this.navigate(1);
    });
  }

  get config() {
    return readConfig(this);
  }

  render() {
    const {
      images = [],
      columns = 3,
      format = "1 / 1",
      gap = "8px",
    } = this.config;
    const cols = Math.max(1, Number.parseInt(columns, 10) || 3);

    if (!Array.isArray(images) || images.length === 0) {
      renderShadow(
        this,
        `<div class="gallery-empty">No gallery images configured</div>`,
      );
      return;
    }

    const thumbs = images
      .map(
        (url, index) =>
          `<button type="button" class="gallery-thumb" style="display:block;width:100%;aspect-ratio:${format};" data-gallery-thumb-index="${index}"><img src="${url}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" /></button>`,
      )
      .join("");

    renderShadow(
      this,
      `<div class="gallery-grid" style="display:grid;grid-template-columns:repeat(${cols}, minmax(0, 1fr));gap:${gap};--gallery-columns: ${cols}; --gallery-gap: ${gap}; --gallery-ratio: ${format};">${thumbs}</div><div class="gallery-lightbox" data-gallery-lightbox hidden style="display:none;"><button type="button" class="gallery-lightbox-close" data-gallery-close>X</button><button type="button" class="gallery-lightbox-nav is-prev" data-gallery-prev><</button><img class="gallery-lightbox-image" data-gallery-image src="" alt="" /><button type="button" class="gallery-lightbox-nav is-next" data-gallery-next>></button></div>`,
    );
  }

  openLightbox(index) {
    const { images = [] } = this.config;
    if (!Array.isArray(images) || index < 0 || index >= images.length) return;
    this.lightboxIndex = index;
    this.updateLightbox();
  }

  closeLightbox() {
    this.lightboxIndex = -1;
    this.updateLightbox();
  }

  navigate(delta) {
    const { images = [] } = this.config;
    if (
      !Array.isArray(images) ||
      images.length === 0 ||
      this.lightboxIndex < 0
    ) {
      return;
    }
    this.lightboxIndex =
      (this.lightboxIndex + delta + images.length) % images.length;
    this.updateLightbox();
  }

  updateLightbox() {
    const root = this.shadowRoot;
    const lightbox = root?.querySelector("[data-gallery-lightbox]");
    const image = root?.querySelector("[data-gallery-image]");
    const { images = [] } = this.config;
    if (
      !(lightbox instanceof HTMLElement) ||
      !(image instanceof HTMLImageElement)
    ) {
      return;
    }

    if (this.lightboxIndex < 0) {
      lightbox.hidden = true;
      lightbox.style.display = "none";
      return;
    }

    lightbox.hidden = false;
    lightbox.style.display = "flex";
    image.src = String(images[this.lightboxIndex] || "");
  }
}

class OwbSection extends HTMLElement {
  connectedCallback() {
    const settings = readConfig(this);
    const width = String(settings.settingWidth || "normal");
    const widthClass =
      width === "full"
        ? "is-full-width"
        : width === "custom"
          ? ""
          : "is-normal-width";
    const customCss = String(settings.customCss || "").trim();

    renderShadow(
      this,
      `<style>:host{display:block;}section .container{position:relative;padding:var(--section-padding-top, 7rem) var(--section-padding-right, 2rem) var(--section-padding-bottom, 6rem) var(--section-padding-left, 2rem);margin:0 auto;}section .container.is-normal-width{max-width:960px;}section .container.is-full-width{max-width:100%;}</style>${customCss ? `<style>${customCss}</style>` : ""}<section style="${getSectionStyle(settings)}"><div class="container ${widthClass}" style="${getSectionContainerStyle(settings)}"><slot></slot></div></section>`,
    );
  }
}

if (!customElements.get("owb-text")) {
  customElements.define("owb-text", OwbText);
}
if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
}
if (!customElements.get("owb-button")) {
  customElements.define("owb-button", OwbButton);
}
if (!customElements.get("owb-embed")) {
  customElements.define("owb-embed", OwbEmbed);
}
if (!customElements.get("owb-social-media")) {
  customElements.define("owb-social-media", OwbSocialMedia);
}
if (!customElements.get("owb-gallery")) {
  customElements.define("owb-gallery", OwbGallery);
}
if (!customElements.get("owb-section")) {
  customElements.define("owb-section", OwbSection);
}
