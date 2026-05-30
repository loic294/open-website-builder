import { LitElement, html, css } from "lit";

export const defaultSliderConfig = {
  type: "slider",
  images: [],
};

export class OwbSlider extends LitElement {
  static editorPlugin = null;

  static styles = css`
    :host {
      display: block;
    }
  `;

  static properties = {
    images: { type: Array },
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
  };

  constructor() {
    super();
    this.images = [];
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this._currentSlot = 0;
    this._silentJumpCleanup = null;
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        if (props.images !== undefined) this.images = props.images;
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
    super.connectedCallback();
    window.addEventListener("keydown", this._onKeydown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKeydown);
    if (this._silentJumpCleanup) this._silentJumpCleanup();
    super.disconnectedCallback();
  }

  firstUpdated() {
    const images = Array.isArray(this.images) ? this.images : [];
    this._currentSlot = images.length;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => this._doInitialScroll()),
    );
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbSlider.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  _onKeydown(event) {
    if (event.key === "ArrowRight") this.navigate(1);
    if (event.key === "ArrowLeft") this.navigate(-1);
  }

  _getTrack() {
    return this.renderRoot.querySelector(".slider-track");
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
    const images = Array.isArray(this.images) ? this.images : [];
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
    const images = Array.isArray(this.images) ? this.images : [];
    const settings = this.settings ?? {};
    const format = String(settings.sliderFormat || "3 / 2");
    const itemWidth = String(settings.sliderItemWidth || "80%");
    const height = String(settings.sliderHeight || "400px");
    const gap = String(settings.sliderGap || "12px");
    const count = images.length;

    if (count === 0) {
      return html`
        <link rel="stylesheet" href="/owb-styles/slider.css" />
        <div class="slider-empty">No slider images configured</div>
      `;
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
      <link rel="stylesheet" href="/owb-styles/slider.css" />
      <div class="slider-block">
        <div class="slider-track-wrapper">
          <div class="slider-track" style="${trackStyle}">
            ${count > 1
              ? [...images, ...images, ...images].map(slideTemplate)
              : images.map(slideTemplate)}
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
