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

const SHADOW_STYLESHEET_HREF = "/owb-components.css";

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

class OwbText extends HTMLElement {
  connectedCallback() {
    const { content = "", settings = {} } = readConfig(this);
    const customCss = String(settings.customCss || "").trim();
    const normalizedContent = normalizeTextLinksToSameTab(content);
    renderShadow(
      this,
      `${customCss ? `<style>${customCss}</style>` : ""}<div class="text-block ProseMirror">${normalizedContent}</div>`,
    );
  }
}

class OwbImage extends HTMLElement {
  connectedCallback() {
    const { url = "", settings = {} } = readConfig(this);
    const mode = String(settings.imageSizeMode || "contained");
    const customCss = String(settings.customCss || "").trim();
    const clickAction = String(settings.imageClickAction || "none");
    const linkUrl = String(settings.imageLinkUrl || "").trim();
    const linkTarget = String(settings.imageLinkTarget || "current");

    const imageFrame = url
      ? `<div class="image-frame size-${mode}"><img src="${escapeAttr(url)}" alt="" loading="lazy" /></div>`
      : `<div class="image-frame"></div>`;

    let imageContent = imageFrame;
    if (clickAction === "link" && linkUrl) {
      const target = linkTarget === "new" ? "_blank" : "_self";
      const rel = target === "_blank" ? ` rel="noopener noreferrer"` : "";
      imageContent = `<a class="image-action-link" href="${escapeAttr(linkUrl)}" target="${target}"${rel}>${imageFrame}</a>`;
    } else if (clickAction === "lightbox" && url) {
      imageContent = `<button class="image-lightbox-trigger" type="button" data-image-open-lightbox>${imageFrame}</button>`;
    }

    const lightboxMarkup =
      clickAction === "lightbox" && url
        ? `<div class="image-lightbox" data-image-lightbox hidden style="display:none;"><button class="image-lightbox-close" type="button" aria-label="Close image" data-image-lightbox-close>x</button><img class="image-lightbox-image" src="${escapeAttr(url)}" alt="" /></div>`
        : "";

    const root = renderShadow(
      this,
      `<style>:host{display:block;width:100%;height:100%;}</style>${customCss ? `<style>${customCss}</style>` : ""}<div class="image-block size-${mode}">${imageContent}</div>${lightboxMarkup}`,
    );

    const lightbox = root.querySelector("[data-image-lightbox]");
    const openBtn = root.querySelector("[data-image-open-lightbox]");
    const closeBtn = root.querySelector("[data-image-lightbox-close]");

    if (lightbox instanceof HTMLElement) {
      const openLightbox = () => {
        lightbox.hidden = false;
        lightbox.style.display = "grid";
      };

      const closeLightbox = () => {
        lightbox.hidden = true;
        lightbox.style.display = "none";
      };

      if (openBtn instanceof HTMLElement) {
        openBtn.addEventListener("click", (event) => {
          event.preventDefault();
          openLightbox();
        });
      }

      if (closeBtn instanceof HTMLElement) {
        closeBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          closeLightbox();
        });
      }

      lightbox.addEventListener("click", () => {
        closeLightbox();
      });

      this.onImageLightboxKeydown = (event) => {
        if (event.key === "Escape") {
          closeLightbox();
        }
      };

      window.addEventListener("keydown", this.onImageLightboxKeydown);
    }
  }

  disconnectedCallback() {
    if (this.onImageLightboxKeydown) {
      window.removeEventListener("keydown", this.onImageLightboxKeydown);
      this.onImageLightboxKeydown = null;
    }
  }
}

class OwbButton extends HTMLElement {
  connectedCallback() {
    const { content = "Button", settings = {} } = readConfig(this);
    const link = String(settings.buttonLink || "").trim();
    const size = String(settings.buttonSize || "m");
    const theme = String(settings.buttonTheme || "primary");
    const variant = String(settings.buttonVariant || "filled");
    const buttonType = String(settings.buttonType || "link");
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

    const buttonMarkup =
      buttonType === "submit" || buttonType === "button"
        ? `<button class="site-button theme-${theme} variant-${variant}" type="${buttonType}" style="${sizeStyle} --button-radius: ${radius};">${content}</button>`
        : `<a class="site-button theme-${theme} variant-${variant}" href="${link || "#"}" style="${sizeStyle} --button-radius: ${radius};">${content}</a>`;

    renderShadow(
      this,
      `<div class="button-block"><div class="button-preview-wrap">${buttonMarkup}</div></div>`,
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
    const alignment = String(settings.socialButtonAlignment || "left");
    const displayMode = String(settings.socialDisplayMode || "icon-text");
    const iconColorMode = String(settings.socialIconColorMode || "brand");
    const showIcon = displayMode !== "text";
    const showText = displayMode !== "icon";
    const radius = getSocialButtonShapeRadius(shape, customRadius);

    const contentHtml = items
      .map((item) => {
        const label = String(
          item?.name || item?.iconTitle || item?.icon || "Social",
        );
        const href = String(item?.link || "").trim() || "#";
        const iconSvg = String(item?.iconSvg || "").trim();
        const iconHex = String(item?.iconHex || "777777").trim();
        const iconColorClass =
          iconColorMode === "text" ? " use-text-color" : "";

        const iconMarkup = showIcon
          ? iconSvg
            ? `<span class="social-icon"><span class="simple-icon is-button${iconColorClass}" style="--simple-icon-color: #${escapeAttr(iconHex)};">${iconSvg}</span></span>`
            : `<span class="social-icon"><span class="social-fallback-icon is-button">&#9679;</span></span>`
          : "";

        const labelMarkup = showText ? `<span>${escapeHtml(label)}</span>` : "";

        return `<a class="social-button size-${size} theme-${theme} variant-${variant}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" style="--social-button-radius: ${escapeAttr(radius)};">${iconMarkup}${labelMarkup}</a>`;
      })
      .join("");

    renderShadow(
      this,
      `<div class="social-block"><div class="social-buttons-grid align-${alignment}">${contentHtml}</div></div>`,
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

    const responsiveCss = buildResponsiveSectionCss(
      settings,
      "section",
      ".container",
    );
    renderShadow(
      this,
      `<style>:host{display:block;}section .container{position:relative;padding:var(--section-padding-top, 7rem) var(--section-padding-right, 2rem) var(--section-padding-bottom, 6rem) var(--section-padding-left, 2rem);margin:0 auto;}section .container.is-normal-width{max-width:960px;}section .container.is-full-width{max-width:100%;}${responsiveCss}</style>${customCss ? `<style>${customCss}</style>` : ""}<section style="${getSectionStyle(settings)}"><div class="container ${widthClass}" style="${getSectionContainerStyle(settings)}"><slot></slot></div></section>`,
    );
  }
}

class OwbContainer extends HTMLElement {
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

    const responsiveCss = buildResponsiveSectionCss(
      settings,
      ".container",
      ".container",
    );
    renderShadow(
      this,
      `<style>:host{display:block;} .container{position:relative;padding:var(--section-padding-top, 7rem) var(--section-padding-right, 2rem) var(--section-padding-bottom, 6rem) var(--section-padding-left, 2rem);margin:0 auto;} .container.is-normal-width{max-width:960px;} .container.is-full-width{max-width:100%;}${responsiveCss}</style>${customCss ? `<style>${customCss}</style>` : ""}<div class="container ${widthClass}" style="${getSectionStyle(settings)}; ${getSectionContainerStyle(settings)}"><slot></slot></div>`,
    );
  }
}

class OwbForm extends HTMLElement {
  connectedCallback() {
    const settings = readConfig(this);
    const children = Array.from(this.childNodes).filter(
      (node) =>
        !(
          node instanceof HTMLScriptElement &&
          node.hasAttribute("data-owb-config")
        ),
    );
    const action = String(settings.formActionUrl || "").trim();
    const method = String(settings.formMethod || "post").toLowerCase();
    const submitMode = String(settings.formSubmitMode || "success-message");
    const successMessage = String(
      settings.formSuccessMessage || "Thanks! Your form has been submitted.",
    );
    const redirectUrl = String(settings.formRedirectUrl || "").trim();
    const width = String(settings.settingWidth || "normal");
    const widthClass =
      width === "full"
        ? "is-full-width"
        : width === "custom"
          ? ""
          : "is-normal-width";

    this.textContent = "";

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      :host { display: block; }
      .owb-form-container { position: relative; padding: var(--section-padding-top, 7rem) var(--section-padding-right, 2rem) var(--section-padding-bottom, 6rem) var(--section-padding-left, 2rem); margin: 0 auto; }
      .owb-form-container.is-normal-width { max-width: 960px; }
      .owb-form-container.is-full-width { max-width: 100%; }
      .owb-form { display: grid; gap: 12px; }
      .owb-form-success { margin: 10px 0 0; color: var(--website-success-color, #267e3e); font-weight: 600; }
    `;

    const containerEl = document.createElement("div");
    containerEl.className = `owb-form-container ${widthClass}`.trim();
    containerEl.setAttribute(
      "style",
      `${getSectionStyle(settings)}; ${getSectionContainerStyle(settings)}`,
    );

    const formEl = document.createElement("form");
    formEl.className = "owb-form";
    formEl.method = method === "get" ? "get" : "post";
    if (action) {
      formEl.action = action;
    }

    const successEl = document.createElement("p");
    successEl.className = "owb-form-success";
    successEl.hidden = true;
    successEl.textContent = successMessage;

    for (const child of children) {
      formEl.appendChild(child);
    }

    formEl.addEventListener("submit", (event) => {
      event.preventDefault();

      if (submitMode === "redirect") {
        if (redirectUrl) {
          window.location.assign(redirectUrl);
        }
        return;
      }

      successEl.hidden = false;
    });

    containerEl.append(formEl, successEl);
    this.append(styleEl, containerEl);
  }
}

class OwbInput extends HTMLElement {
  connectedCallback() {
    const parsed = readConfig(this);
    const settings =
      parsed && typeof parsed.settings === "object" ? parsed.settings : parsed;
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

class OwbCollectionContent extends HTMLElement {
  connectedCallback() {
    // Marker component: publish output already injects its children where needed.
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
if (!customElements.get("owb-container")) {
  customElements.define("owb-container", OwbContainer);
}
if (!customElements.get("owb-form")) {
  customElements.define("owb-form", OwbForm);
}
if (!customElements.get("owb-input")) {
  customElements.define("owb-input", OwbInput);
}
if (!customElements.get("owb-collection-content")) {
  customElements.define("owb-collection-content", OwbCollectionContent);
}
