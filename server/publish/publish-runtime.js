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

class OwbText extends HTMLElement {
  connectedCallback() {
    const { content = "", settings = {} } = readConfig(this);
    const customCss = String(settings.customCss || "").trim();
    const normalizedContent = normalizeTextLinksToSameTab(content);
    renderShadow(
      this,
      `${customCss ? `<style>${customCss}</style>` : ""}<div class="text-block ProseMirror">${normalizedContent}</div>`,
      "/owb-styles/text.css",
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
      "/owb-styles/image.css",
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

class OwbEmbed extends HTMLElement {
  connectedCallback() {
    const { html = "" } = readConfig(this);
    const safeHtml = sanitizeEmbed(html);
    renderShadow(
      this,
      safeHtml.trim()
        ? `<div class="embed-preview">${safeHtml}</div>`
        : `<div class="embed-placeholder">No embed content</div>`,
      "/owb-styles/embed.css",
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
        "/owb-styles/social-media.css",
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
      "/owb-styles/social-media.css",
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
        "/owb-styles/gallery.css",
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
      "/owb-styles/gallery.css",
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

class OwbSlider extends HTMLElement {
  constructor() {
    super();
    this._currentSlot = 0;
    this._silentJumpCleanup = null;
  }

  get config() {
    return readConfig(this);
  }

  connectedCallback() {
    this.render();
    const { images = [] } = this.config;
    this._currentSlot = images.length;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => this._doInitialScroll()),
    );

    const root = this.shadowRoot;
    if (root) {
      root.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        if (target.closest("[data-slider-prev]")) {
          this.navigate(-1);
        } else if (target.closest("[data-slider-next]")) {
          this.navigate(1);
        }
      });
    }

    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") this.navigate(-1);
      if (event.key === "ArrowRight") this.navigate(1);
    });
  }

  disconnectedCallback() {
    if (this._silentJumpCleanup) this._silentJumpCleanup();
  }

  _getTrack() {
    return this.shadowRoot?.querySelector(".slider-track") ?? null;
  }

  _scrollToSlot(slot, behavior = "instant") {
    const track = this._getTrack();
    if (!track) return;
    const slides = track.querySelectorAll(".slider-slide");
    const slide = slides[slot];
    if (!slide) return;
    const scrollTarget =
      slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
    track.scrollTo({ left: Math.max(0, scrollTarget), behavior });
  }

  _doInitialScroll() {
    const initialSlot = this._currentSlot;
    const track = this._getTrack();
    if (!track) return;
    const slides = track.querySelectorAll(".slider-slide");

    const tryScroll = () => {
      let ready = true;
      for (let i = 0; i <= initialSlot; i++) {
        if (!slides[i] || slides[i].offsetWidth === 0) {
          ready = false;
          break;
        }
      }
      if (ready) this._scrollToSlot(this._currentSlot);
    };

    tryScroll();

    for (let i = 0; i <= initialSlot; i++) {
      const img = slides[i]?.querySelector("img");
      if (img && (!img.complete || img.naturalWidth === 0)) {
        img.addEventListener("load", tryScroll, { once: true });
        img.addEventListener("error", tryScroll, { once: true });
      }
    }
  }

  navigate(delta) {
    const { images = [] } = this.config;
    const n = images.length;
    if (n <= 1) return;

    if (this._silentJumpCleanup) {
      this._silentJumpCleanup();
      this._silentJumpCleanup = null;
    }

    const nextSlot = this._currentSlot + delta;
    this._currentSlot = nextSlot;
    this._scrollToSlot(nextSlot, "smooth");

    if (nextSlot < n || nextSlot >= 2 * n) {
      const track = this._getTrack();
      let done = false;
      const doJump = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        track?.removeEventListener("scrollend", doJump);
        const realSlot = (((nextSlot % n) + n) % n) + n;
        this._currentSlot = realSlot;
        this._scrollToSlot(realSlot, "instant");
      };
      track?.addEventListener("scrollend", doJump, { once: true });
      const timer = setTimeout(doJump, 600);
      this._silentJumpCleanup = () => {
        done = true;
        clearTimeout(timer);
        track?.removeEventListener("scrollend", doJump);
      };
    }
  }

  render() {
    const {
      images = [],
      format = "3 / 2",
      itemWidth = "80%",
      height = "400px",
      gap = "12px",
    } = this.config;
    const n = images.length;

    if (n === 0) {
      renderShadow(
        this,
        `<div class="slider-empty">No slider images configured</div>`,
        "/owb-styles/slider.css",
      );
      return;
    }

    const isAuto = format === "auto";
    const slideClass = `slider-slide${isAuto ? " is-auto-ratio" : ""}`;
    const trackStyle = `--slider-item-width: ${itemWidth}; --slider-gap: ${gap}; ${
      isAuto ? `--slider-height: ${height};` : `--slider-ratio: ${format};`
    }`;

    const slideHtml = (url) =>
      `<div class="${slideClass}"><img src="${url}" alt="" loading="lazy" /></div>`;

    const realSlides = images.map(slideHtml).join("");
    const allSlides = n > 1 ? realSlides + realSlides + realSlides : realSlides;

    const navHtml =
      n > 1
        ? `<div class="slider-nav"><button type="button" class="slider-nav-btn" data-slider-prev>&#8249;</button><button type="button" class="slider-nav-btn" data-slider-next>&#8250;</button></div>`
        : "";

    renderShadow(
      this,
      `<div class="slider-block"><div class="slider-track-wrapper"><div class="slider-track" style="${trackStyle}">${allSlides}</div></div>${navHtml}</div>`,
      "/owb-styles/slider.css",
    );
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
      owb-input { box-sizing: border-box; }
      .form-input-block { position: relative; width: 100%; margin-bottom: 16px; }
      .form-input-label { display: block; margin-bottom: 8px; font-size: 0.9rem; font-weight: 600; color: var(--owb-section-child-text-color, inherit); }
      .form-input-required { color: #b42318; }
      .form-input-field, .form-input-textarea { width: 100%; border: 1px solid color-mix(in srgb, #111111 22%, transparent); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; line-height: 1.4; background: var(--owb-section-child-background-color, #fff); color: var(--owb-section-child-text-color, inherit); font-family: inherit; box-sizing: border-box; }
      .form-input-textarea { resize: vertical; }
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
    const challengeUrl = String(config.captchaChallengeUrl || "").trim();

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

if (!customElements.get("owb-text")) {
  customElements.define("owb-text", OwbText);
}
if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
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
if (!customElements.get("owb-slider")) {
  customElements.define("owb-slider", OwbSlider);
}

// ── OwbNavbar ────────────────────────────────────────────────────────────────

class OwbNavbar extends HTMLElement {
  constructor() {
    super();
    this._mobileOpen = false;
    this._resizeHandler = null;
  }

  connectedCallback() {
    this.render();

    const root = this.shadowRoot;
    if (root) {
      root.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        if (target.closest("[data-navbar-toggle]")) {
          this._mobileOpen = !this._mobileOpen;
          this._updateMobileState();
        } else if (target.closest("[data-navbar-close]")) {
          this._mobileOpen = false;
          this._updateMobileState();
        }
      });
    }

    this._resizeHandler = () => {
      const config = readConfig(this);
      const settings = config.settings || {};
      const bp = Number.parseInt(
        String(settings.navbarMobileBreakpoint || "768"),
        10,
      );
      if (!Number.isNaN(bp) && window.innerWidth > bp) {
        this._mobileOpen = false;
        this._updateMobileState();
      }
    };
    window.addEventListener("resize", this._resizeHandler);
  }

  disconnectedCallback() {
    if (this._resizeHandler) {
      window.removeEventListener("resize", this._resizeHandler);
      this._resizeHandler = null;
    }
  }

  _updateMobileState() {
    const root = this.shadowRoot;
    if (!root) return;
    const menu = root.querySelector(".navbar-mobile-menu");
    if (!menu) return;
    if (this._mobileOpen) {
      menu.classList.add("is-open");
    } else {
      menu.classList.remove("is-open");
    }
  }

  render() {
    const config = readConfig(this);
    const links = Array.isArray(config.links) ? config.links : [];
    const settings = config.settings || {};

    const mobileOn =
      settings.navbarMobileEnabled === true ||
      settings.navbarMobileEnabled === "true";
    const mobileType = String(settings.navbarMobileType || "dropdown");
    const breakpoint = String(settings.navbarMobileBreakpoint || "768px");
    const hasUnderline =
      settings.navbarUnderlineOnHover === true ||
      settings.navbarUnderlineOnHover === "true";
    const hasUnderlineActive =
      settings.navbarUnderlineActive === true ||
      settings.navbarUnderlineActive === "true";
    const currentPath = window.location.pathname;
    const isActiveLink = (link) => {
      const href = String(link.url || link.pageId || "").trim();
      if (!href || href === "#") return false;
      if (href === "/") return currentPath === "/";
      return currentPath === href || currentPath.startsWith(href + "/");
    };

    const navVars = [
      settings.navbarGap ? `--navbar-gap: ${settings.navbarGap}` : "",
      settings.navbarFontFamily
        ? `--navbar-font-family: ${settings.navbarFontFamily}`
        : "",
      settings.navbarFontSize
        ? `--navbar-font-size: ${settings.navbarFontSize}`
        : "",
      settings.navbarFontWeight
        ? `--navbar-font-weight: ${settings.navbarFontWeight}`
        : "",
      settings.navbarColor ? `--navbar-color: ${settings.navbarColor}` : "",
      settings.navbarHoverColor
        ? `--navbar-hover-color: ${settings.navbarHoverColor}`
        : "",
    ]
      .filter(Boolean)
      .join("; ");

    const mobileVars = [
      settings.navbarMobileBackgroundColor
        ? `--navbar-mobile-bg: ${settings.navbarMobileBackgroundColor}`
        : "",
      settings.navbarMobileTextColor
        ? `--navbar-mobile-color: ${settings.navbarMobileTextColor}`
        : "",
      settings.navbarMobileGap
        ? `--navbar-mobile-gap: ${settings.navbarMobileGap}`
        : "",
      settings.navbarMobilePadding
        ? `--navbar-mobile-padding: ${settings.navbarMobilePadding}`
        : "",
      settings.navbarMobileAlignH
        ? `--navbar-mobile-align-h: ${settings.navbarMobileAlignH}`
        : "",
      settings.navbarMobileAlignV
        ? `--navbar-mobile-justify-v: ${settings.navbarMobileAlignV}`
        : "",
      settings.navbarMobileFontSize
        ? `--navbar-mobile-font-size: ${settings.navbarMobileFontSize}`
        : "",
      settings.navbarMobileFontWeight
        ? `--navbar-mobile-font-weight: ${settings.navbarMobileFontWeight}`
        : "",
    ]
      .filter(Boolean)
      .join("; ");

    const hamburger = (() => {
      const icon = String(settings.navbarMobileMenuIcon || "hamburger").trim();
      return icon === "hamburger" || !icon ? "&#9776;" : icon;
    })();
    const iconSize = String(settings.navbarMobileMenuIconSize || "").trim();

    const esc = (s) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");

    const linkHtml = (link, cls) => {
      const active = isActiveLink(link) ? " is-active" : "";
      return `<a class="${cls}${active}" href="${esc(link.url || link.pageId || "#")}" target="${esc(link.target || "_self")}">${esc(link.label || link.url || link.pageId || "")}</a>`;
    };

    const desktopLinks = links.map((l) => linkHtml(l, "navbar-link")).join("");
    const mobileLinks = links
      .map((l) => linkHtml(l, "navbar-mobile-link"))
      .join("");

    const mediaQuery = mobileOn
      ? `<style>@media(max-width:${breakpoint}){.navbar{display:none!important}.navbar-mobile-toggle{display:flex!important}}</style>`
      : "";

    const closeBtn =
      mobileType === "fullscreen"
        ? `<button type="button" class="navbar-mobile-close" data-navbar-close>&#x2715;</button>`
        : "";

    const mobileHtml = mobileOn
      ? `<button type="button" class="navbar-mobile-toggle" data-navbar-toggle${iconSize ? ` style="font-size:${iconSize}"` : ""}>${hamburger}</button>` +
        `<div class="navbar-mobile-menu ${mobileType === "fullscreen" ? "is-fullscreen" : "is-dropdown"}" style="${mobileVars}">` +
        closeBtn +
        `<div class="navbar-mobile-links">${mobileLinks}</div>` +
        `</div>`
      : "";

    const blockStyle = mobileOn ? ` style="${mobileVars}"` : "";

    renderShadow(
      this,
      `${mediaQuery}<div class="navbar-block"${blockStyle}><nav class="navbar${hasUnderline ? " has-underline-hover" : ""}${hasUnderlineActive ? " has-underline-active" : ""}" style="${navVars}">${desktopLinks}</nav>${mobileHtml}</div>`,
      "/owb-styles/navbar.css",
    );
  }
}

if (!customElements.get("owb-navbar")) {
  customElements.define("owb-navbar", OwbNavbar);
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
if (!customElements.get("owb-captcha")) {
  customElements.define("owb-captcha", OwbCaptcha);
}
if (!customElements.get("owb-checkbox")) {
  customElements.define("owb-checkbox", OwbCheckbox);
}
if (!customElements.get("owb-collection-content")) {
  customElements.define("owb-collection-content", OwbCollectionContent);
}
