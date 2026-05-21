import { LitElement, html, css, unsafeCSS } from "lit";

class EditorMenu extends LitElement {
  render() {
    return html`<div>
      <span>Pages</span>
      <ul>
        <li>Home</li>
        <li>About</li>
        <li>Contact</li>
      </ul>
      <span>Collections</span>
      <ul>
        <li>Products</li>
        <li>Services</li>
      </ul>
    </div>`;
  }
}
customElements.define("editor-menu", EditorMenu);
