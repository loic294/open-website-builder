import { LitElement, html, css, unsafeCSS } from "lit";
import { ChevronLeft, ChevronRight, Image, createElement } from "lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";

export const defaultSliderConfig = {
  type: "slider",
  images: [],
};

const FORMAT_OPTIONS = [
  { label: "Original", value: "auto" },
  { label: "Square", value: "1 / 1" },
  { label: "3x2", value: "3 / 2" },
  { label: "4x3", value: "4 / 3" },
  { label: "16x9", value: "16 / 9" },
  { label: "2x3", value: "2 / 3" },
  { label: "3x4", value: "3 / 4" },
  { label: "9x16", value: "9 / 16" },
];

class SiteSlider extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    sliderImages: { type: Array },
    sliderFormat: { type: String },
    sliderItemWidth: { type: String },
    sliderHeight: { type: String },
    sliderGap: { type: String },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.sliderImages = [];
    this.sliderFormat = "3 / 2";
    this.sliderItemWidth = "80%";
    this.sliderHeight = "400px";
    this.sliderGap = "12px";
    this._currentIndex = 0;
    this._silentJumpCleanup = null;
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.sliderImages = Array.isArray(this.node?.images)
        ? this.node.images
        : [];
      this._currentIndex = 0;

      this.updateComplete.then(() =>
        requestAnimationFrame(() => this._scrollToReal(0)),
      );

      this.syncSettingsStateFromNode({
        sliderFormat: "3 / 2",
        sliderItemWidth: "80%",
        sliderHeight: "400px",
        sliderGap: "12px",
      });
    }
  }

  updateNodeImages(nodes, targetNodeId, nextImages) {
    return nodes.map((currentNode) => {
      if (currentNode?.id === targetNodeId && currentNode?.type === "slider") {
        return {
          ...currentNode,
          images: nextImages,
        };
      }

      if (Array.isArray(currentNode?.content)) {
        return {
          ...currentNode,
          content: this.updateNodeImages(
            currentNode.content,
            targetNodeId,
            nextImages,
          ),
        };
      }

      return currentNode;
    });
  }

  updateImagesFromText(nextValue) {
    const nextImages = String(nextValue || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    this.sliderImages = nextImages;
    this.currentIndex = 0;

    if (!this.pageConfig || !this.node?.id) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: this.updateNodeImages(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        nextImages,
      ),
    };

    this.node = {
      ...this.node,
      images: nextImages,
    };
    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  openSliderSettings() {
    this.syncSettingsStateFromNode({
      sliderFormat: "3 / 2",
      sliderItemWidth: "80%",
      sliderHeight: "400px",
      sliderGap: "12px",
    });

    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <settings-section title="Photos">
          <textarea
            class="slider-textarea"
            .value=${this.sliderImages.join("\n")}
            placeholder="One image URL per line"
            @input=${(event) => this.updateImagesFromText(event.target.value)}
          ></textarea>
        </settings-section>
        <settings-section
          title="Layout"
          ?overridden=${this.hasAnyOverriddenKeys(
            "sliderFormat",
            "sliderItemWidth",
            "sliderHeight",
            "sliderGap",
          )}
        >
          <editor-select
            label="Picture format"
            .value=${this.sliderFormat}
            .options=${FORMAT_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            @change=${(event) =>
              this.updateSettingsState({ sliderFormat: event.detail.value })}
          ></editor-select>
          ${this.sliderFormat === "auto"
            ? html`
                <editor-text-input
                  label="Height"
                  placeholder="400px"
                  .value=${this.sliderHeight}
                  @change=${(event) =>
                    this.updateSettingsState({
                      sliderHeight: event.detail.value,
                    })}
                ></editor-text-input>
              `
            : html`
                <editor-text-input
                  label="Item width"
                  placeholder="80%"
                  .value=${this.sliderItemWidth}
                  @change=${(event) =>
                    this.updateSettingsState({
                      sliderItemWidth: event.detail.value,
                    })}
                ></editor-text-input>
              `}
          <editor-text-input
            label="Gap"
            placeholder="12px"
            .value=${this.sliderGap}
            @change=${(event) =>
              this.updateSettingsState({ sliderGap: event.detail.value })}
          ></editor-text-input>
        </settings-section>
      `,
    });
  }

  openSliderSettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }

    this.openSliderSettings();
  }

  _getTrack() {
    return this.renderRoot.querySelector(".slider-track");
  }

  _scrollToReal(realIndex) {
    const track = this._getTrack();
    if (!track) return;
    const slides = track.querySelectorAll(".slider-slide");
    const slide = slides[realIndex + 1]; // +1 for the leading clone
    if (!slide) return;
    slide.scrollIntoView({
      behavior: "instant",
      inline: "center",
      block: "nearest",
    });
  }

  navigate(delta) {
    const n = this.sliderImages.length;
    if (n <= 1) return;

    if (this._silentJumpCleanup) {
      this._silentJumpCleanup();
      this._silentJumpCleanup = null;
    }

    const nextRealIndex = (this._currentIndex + delta + n) % n;
    this._currentIndex = nextRealIndex;

    const track = this._getTrack();
    if (!track) return;
    const slides = track.querySelectorAll(".slider-slide");

    const isForwardWrap = delta > 0 && nextRealIndex === 0;
    const isBackwardWrap = delta < 0 && nextRealIndex === n - 1;
    const scrollDomIndex = isForwardWrap
      ? n + 1 // trailing clone of first
      : isBackwardWrap
        ? 0 // leading clone of last
        : nextRealIndex + 1;

    slides[scrollDomIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });

    if (isForwardWrap || isBackwardWrap) {
      let done = false;
      const doJump = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        track.removeEventListener("scrollend", doJump);
        this._scrollToReal(nextRealIndex);
      };
      track.addEventListener("scrollend", doJump, { once: true });
      const timer = setTimeout(doJump, 600);
      this._silentJumpCleanup = () => {
        done = true;
        clearTimeout(timer);
        track.removeEventListener("scrollend", doJump);
      };
    }
  }

  render() {
    const itemWidth = String(this.sliderItemWidth || "80%").trim() || "80%";
    const gap = String(this.sliderGap || "12px").trim() || "12px";
    const format = String(this.sliderFormat || "3 / 2").trim() || "3 / 2";
    const height = String(this.sliderHeight || "400px").trim() || "400px";
    const isAuto = format === "auto";
    const count = this.sliderImages.length;
    const slideClass = `slider-slide${isAuto ? " is-auto-ratio" : ""}`;

    const trackStyle = `--slider-item-width: ${itemWidth}; --slider-gap: ${gap};${
      isAuto ? ` --slider-height: ${height};` : ` --slider-ratio: ${format};`
    }`;

    const slideTemplate = (url) =>
      html`<div class=${slideClass}>
        <img src=${url} alt="" loading="lazy" />
      </div>`;

    return html`
      <div
        data-editor-block
        @pointerdown=${() => this.openSliderSettingsIfNeeded()}
        class="slider-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        ${count > 0
          ? html`
              <div class="slider-track-wrapper">
                <div class="slider-track" style=${trackStyle}>
                  ${count > 1
                    ? slideTemplate(this.sliderImages[count - 1])
                    : null}
                  ${this.sliderImages.map(slideTemplate)}
                  ${count > 1 ? slideTemplate(this.sliderImages[0]) : null}
                </div>
              </div>
              ${count > 1
                ? html`
                    <div class="slider-nav">
                      <button
                        type="button"
                        class="slider-nav-btn"
                        title="Previous"
                        @click=${(event) => {
                          event.stopPropagation();
                          this.navigate(-1);
                        }}
                      >
                        ${createElement(ChevronLeft)}
                      </button>
                      <button
                        type="button"
                        class="slider-nav-btn"
                        title="Next"
                        @click=${(event) => {
                          event.stopPropagation();
                          this.navigate(1);
                        }}
                      >
                        ${createElement(ChevronRight)}
                      </button>
                    </div>
                  `
                : null}
            `
          : html`
              <div class="slider-empty">
                ${createElement(Image)}
                <span>Add image URLs in settings.</span>
              </div>
            `}
      </div>
    `;
  }
}

export const editorRenderSlider = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-slider
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-slider>`;
};

class OwbSlider extends withVariantConfig(LitElement) {
  static styles = [
    unsafeCSS(styles),
    css`
      :host {
        display: block;
      }
    `,
  ];

  constructor() {
    super();
    this._currentIndex = 0;
    this._silentJumpCleanup = null;
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this._onKeydown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKeydown);
    if (this._silentJumpCleanup) this._silentJumpCleanup();
    super.disconnectedCallback();
  }

  firstUpdated() {
    requestAnimationFrame(() => this._scrollToReal(0));
  }

  _onKeydown(event) {
    if (event.key === "ArrowRight") this.navigate(1);
    if (event.key === "ArrowLeft") this.navigate(-1);
  }

  _getTrack() {
    return this.renderRoot.querySelector(".slider-track");
  }

  _scrollToReal(realIndex) {
    const track = this._getTrack();
    if (!track) return;
    const slides = track.querySelectorAll(".slider-slide");
    const slide = slides[realIndex + 1];
    if (!slide) return;
    slide.scrollIntoView({
      behavior: "instant",
      inline: "center",
      block: "nearest",
    });
  }

  navigate(delta) {
    const { images = [] } = this.config;
    const n = images.length;
    if (n <= 1) return;

    if (this._silentJumpCleanup) {
      this._silentJumpCleanup();
      this._silentJumpCleanup = null;
    }

    const nextRealIndex = (this._currentIndex + delta + n) % n;
    this._currentIndex = nextRealIndex;

    const track = this._getTrack();
    if (!track) return;
    const slides = track.querySelectorAll(".slider-slide");

    const isForwardWrap = delta > 0 && nextRealIndex === 0;
    const isBackwardWrap = delta < 0 && nextRealIndex === n - 1;
    const scrollDomIndex = isForwardWrap
      ? n + 1
      : isBackwardWrap
        ? 0
        : nextRealIndex + 1;

    slides[scrollDomIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });

    if (isForwardWrap || isBackwardWrap) {
      let done = false;
      const doJump = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        track.removeEventListener("scrollend", doJump);
        this._scrollToReal(nextRealIndex);
      };
      track.addEventListener("scrollend", doJump, { once: true });
      const timer = setTimeout(doJump, 600);
      this._silentJumpCleanup = () => {
        done = true;
        clearTimeout(timer);
        track.removeEventListener("scrollend", doJump);
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

    const count = images.length;

    if (count === 0) {
      return html`<div class="slider-empty">No slider images configured</div>`;
    }

    const isAuto = format === "auto";
    const slideClass = `slider-slide${isAuto ? " is-auto-ratio" : ""}`;
    const trackStyle = `--slider-item-width: ${itemWidth}; --slider-gap: ${gap};${
      isAuto ? ` --slider-height: ${height};` : ` --slider-ratio: ${format};`
    }`;

    const slideTemplate = (url) =>
      html`<div class=${slideClass}>
        <img src="${url}" alt="" loading="lazy" />
      </div>`;

    return html`
      <div class="slider-block">
        <div class="slider-track-wrapper">
          <div class="slider-track" style="${trackStyle}">
            ${count > 1 ? slideTemplate(images[count - 1]) : null}
            ${images.map(slideTemplate)}
            ${count > 1 ? slideTemplate(images[0]) : null}
          </div>
        </div>
        ${count > 1
          ? html`
              <div class="slider-nav">
                <button
                  type="button"
                  class="slider-nav-btn"
                  title="Previous"
                  @click=${() => this.navigate(-1)}
                >
                  &#8249;
                </button>
                <button
                  type="button"
                  class="slider-nav-btn"
                  title="Next"
                  @click=${() => this.navigate(1)}
                >
                  &#8250;
                </button>
              </div>
            `
          : null}
      </div>
    `;
  }
}

if (!customElements.get("site-slider")) {
  customElements.define("site-slider", SiteSlider);
}

if (!customElements.get("owb-slider")) {
  customElements.define("owb-slider", OwbSlider);
}
