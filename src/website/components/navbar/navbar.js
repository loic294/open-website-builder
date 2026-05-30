import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";

const bool = (v) => v === true || v === "true";

export class OwbNavbar extends LitElement {
  static editorPlugin = null;

  static properties = {
    links: { type: Array },
    settings: { type: Object },
    currentPath: { type: String },
    node: { type: Object },
    pageConfig: { type: Object },
    _mobileOpen: { state: true },
  };

  constructor() {
    super();
    this.links = [];
    this.settings = {};
    this.currentPath = "";
    this.node = null;
    this.pageConfig = null;
    this._mobileOpen = false;
    this._onResize = this._onResize.bind(this);
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        if (props.links !== undefined) this.links = props.links;
        if (props.settings !== undefined) this.settings = props.settings;
        if (props.currentPath !== undefined)
          this.currentPath = props.currentPath;
      } catch (e) {}
    }
    super.connectedCallback();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this._onResize);
      if (!this.currentPath) {
        this.currentPath = window.location.pathname;
      }
    }
  }

  disconnectedCallback() {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this._onResize);
    }
    super.disconnectedCallback();
  }

  _onResize() {
    const bp = Number.parseInt(
      String(this.settings?.navbarMobileBreakpoint || "768"),
      10,
    );
    if (!Number.isNaN(bp) && window.innerWidth > bp) {
      this._mobileOpen = false;
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbNavbar.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  _buildNavStyle(s) {
    return [
      s.navbarGap && `--navbar-gap: ${s.navbarGap}`,
      s.navbarFontFamily && `--navbar-font-family: ${s.navbarFontFamily}`,
      s.navbarFontSize && `--navbar-font-size: ${s.navbarFontSize}`,
      s.navbarFontWeight && `--navbar-font-weight: ${s.navbarFontWeight}`,
      s.navbarColor && `--navbar-color: ${s.navbarColor}`,
      s.navbarHoverColor && `--navbar-hover-color: ${s.navbarHoverColor}`,
    ]
      .filter(Boolean)
      .join("; ");
  }

  _buildMobileStyle(s) {
    return [
      s.navbarMobileBackgroundColor &&
        `--navbar-mobile-bg: ${s.navbarMobileBackgroundColor}`,
      s.navbarMobileTextColor &&
        `--navbar-mobile-color: ${s.navbarMobileTextColor}`,
      s.navbarMobileGap && `--navbar-mobile-gap: ${s.navbarMobileGap}`,
      s.navbarMobilePadding &&
        `--navbar-mobile-padding: ${s.navbarMobilePadding}`,
      s.navbarMobileAlignH &&
        `--navbar-mobile-align-h: ${s.navbarMobileAlignH}`,
      s.navbarMobileAlignV &&
        `--navbar-mobile-justify-v: ${s.navbarMobileAlignV}`,
      s.navbarMobileFontSize &&
        `--navbar-mobile-font-size: ${s.navbarMobileFontSize}`,
      s.navbarMobileFontWeight &&
        `--navbar-mobile-font-weight: ${s.navbarMobileFontWeight}`,
    ]
      .filter(Boolean)
      .join("; ");
  }

  render() {
    const settings = this.settings || {};
    const links = Array.isArray(this.links) ? this.links : [];
    const currentPath = this.currentPath || "";
    const mobileOn = bool(settings.navbarMobileEnabled);
    const mobileType = String(settings.navbarMobileType || "dropdown");
    const breakpoint = String(settings.navbarMobileBreakpoint || "768px");
    const hasUnderline = bool(settings.navbarUnderlineOnHover);
    const hasUnderlineActive = bool(settings.navbarUnderlineActive);
    const iconSize = String(settings.navbarMobileMenuIconSize || "").trim();

    const isActive = (link) => {
      const href = (link.url || link.pageId || "").trim();
      if (!href || href === "#") return false;
      if (href === "/") return currentPath === "/" || currentPath === "";
      return currentPath === href || currentPath.startsWith(href + "/");
    };

    const hamburger = (() => {
      const icon = String(settings.navbarMobileMenuIcon || "hamburger").trim();
      return icon === "hamburger" || !icon ? "☰" : icon;
    })();

    const navStyle = this._buildNavStyle(settings);
    const mobileStyle = this._buildMobileStyle(settings);
    const spacingCss = getSpacingStyleBlock(settings);
    const isEditorMode = OwbNavbar.editorPlugin !== null;

    return html`
      <link rel="stylesheet" href="/owb-styles/navbar.css" />
      ${spacingCss
        ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
        : null}
      ${mobileOn
        ? unsafeHTML(
            `<style>@media (max-width: ${breakpoint}) { .navbar { display: none !important; } .navbar-mobile-toggle { display: flex !important; } }</style>`,
          )
        : null}
      <div class="navbar-block" style=${mobileOn ? mobileStyle : ""}>
        <nav
          class="navbar${hasUnderline
            ? " has-underline-hover"
            : ""}${hasUnderlineActive ? " has-underline-active" : ""}"
          style=${navStyle}
        >
          ${links.map(
            (link) => html`
              <a
                class="navbar-link${isActive(link) ? " is-active" : ""}"
                href=${link.url || link.pageId || "#"}
                target=${link.target || "_self"}
                @click=${isEditorMode ? (e) => e.preventDefault() : null}
                >${link.label || link.url || link.pageId}</a
              >
            `,
          )}
        </nav>
        ${mobileOn
          ? html`
              <button
                type="button"
                class="navbar-mobile-toggle"
                style=${iconSize ? `font-size:${iconSize}` : ""}
                @click=${() => {
                  this._mobileOpen = !this._mobileOpen;
                }}
              >
                ${hamburger}
              </button>
              <div
                class="navbar-mobile-menu ${mobileType === "fullscreen"
                  ? "is-fullscreen"
                  : "is-dropdown"}${this._mobileOpen ? " is-open" : ""}"
                style=${mobileStyle}
              >
                ${mobileType === "fullscreen"
                  ? html`
                      <button
                        type="button"
                        class="navbar-mobile-close"
                        @click=${() => {
                          this._mobileOpen = false;
                        }}
                      >
                        ✕
                      </button>
                    `
                  : null}
                <div class="navbar-mobile-links">
                  ${links.map(
                    (link) => html`
                      <a
                        class="navbar-mobile-link"
                        href=${link.url || link.pageId || "#"}
                        target=${link.target || "_self"}
                        @click=${isEditorMode
                          ? (e) => e.preventDefault()
                          : null}
                        >${link.label || link.url || link.pageId}</a
                      >
                    `,
                  )}
                </div>
              </div>
            `
          : null}
      </div>
    `;
  }
}
