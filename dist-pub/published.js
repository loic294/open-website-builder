var yt = Object.defineProperty;
var bt = (n, t, e) => t in n ? yt(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : n[t] = e;
var y = (n, t, e) => bt(n, typeof t != "symbol" ? t + "" : t, e);
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const j = globalThis, X = j.ShadowRoot && (j.ShadyCSS === void 0 || j.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, pt = Symbol(), et = /* @__PURE__ */ new WeakMap();
let At = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = !0, s !== pt) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (X && t === void 0) {
      const s = e !== void 0 && e.length === 1;
      s && (t = et.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && et.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const vt = (n) => new At(typeof n == "string" ? n : n + "", void 0, pt), St = (n, t) => {
  if (X) n.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const s = document.createElement("style"), i = j.litNonce;
    i !== void 0 && s.setAttribute("nonce", i), s.textContent = e.cssText, n.appendChild(s);
  }
}, st = X ? (n) => n : (n) => n instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const s of t.cssRules) e += s.cssText;
  return vt(e);
})(n) : n;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Et, defineProperty: wt, getOwnPropertyDescriptor: xt, getOwnPropertyNames: Ct, getOwnPropertySymbols: Pt, getPrototypeOf: kt } = Object, _ = globalThis, it = _.trustedTypes, Ut = it ? it.emptyScript : "", W = _.reactiveElementPolyfillSupport, U = (n, t) => n, Z = { toAttribute(n, t) {
  switch (t) {
    case Boolean:
      n = n ? Ut : null;
      break;
    case Object:
    case Array:
      n = n == null ? n : JSON.stringify(n);
  }
  return n;
}, fromAttribute(n, t) {
  let e = n;
  switch (t) {
    case Boolean:
      e = n !== null;
      break;
    case Number:
      e = n === null ? null : Number(n);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(n);
      } catch {
        e = null;
      }
  }
  return e;
} }, $t = (n, t) => !Et(n, t), nt = { attribute: !0, type: String, converter: Z, reflect: !1, useDefault: !1, hasChanged: $t };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), _.litPropertyMetadata ?? (_.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let C = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = nt) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = Symbol(), i = this.getPropertyDescriptor(t, s, e);
      i !== void 0 && wt(this.prototype, t, i);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    const { get: i, set: o } = xt(this.prototype, t) ?? { get() {
      return this[e];
    }, set(r) {
      this[e] = r;
    } };
    return { get: i, set(r) {
      const l = i == null ? void 0 : i.call(this);
      o == null || o.call(this, r), this.requestUpdate(t, l, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? nt;
  }
  static _$Ei() {
    if (this.hasOwnProperty(U("elementProperties"))) return;
    const t = kt(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(U("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(U("properties"))) {
      const e = this.properties, s = [...Ct(e), ...Pt(e)];
      for (const i of s) this.createProperty(i, e[i]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [s, i] of e) this.elementProperties.set(s, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, s] of this.elementProperties) {
      const i = this._$Eu(e, s);
      i !== void 0 && this._$Eh.set(i, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const s = new Set(t.flat(1 / 0).reverse());
      for (const i of s) e.unshift(st(i));
    } else t !== void 0 && e.push(st(t));
    return e;
  }
  static _$Eu(t, e) {
    const s = e.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((e) => e(this));
  }
  addController(t) {
    var e;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && ((e = t.hostConnected) == null || e.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$EO) == null || e.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const s of e.keys()) this.hasOwnProperty(s) && (t.set(s, this[s]), delete this[s]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return St(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var t;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (t = this._$EO) == null || t.forEach((e) => {
      var s;
      return (s = e.hostConnected) == null ? void 0 : s.call(e);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((e) => {
      var s;
      return (s = e.hostDisconnected) == null ? void 0 : s.call(e);
    });
  }
  attributeChangedCallback(t, e, s) {
    this._$AK(t, s);
  }
  _$ET(t, e) {
    var o;
    const s = this.constructor.elementProperties.get(t), i = this.constructor._$Eu(t, s);
    if (i !== void 0 && s.reflect === !0) {
      const r = (((o = s.converter) == null ? void 0 : o.toAttribute) !== void 0 ? s.converter : Z).toAttribute(e, s.type);
      this._$Em = t, r == null ? this.removeAttribute(i) : this.setAttribute(i, r), this._$Em = null;
    }
  }
  _$AK(t, e) {
    var o, r;
    const s = this.constructor, i = s._$Eh.get(t);
    if (i !== void 0 && this._$Em !== i) {
      const l = s.getPropertyOptions(i), h = typeof l.converter == "function" ? { fromAttribute: l.converter } : ((o = l.converter) == null ? void 0 : o.fromAttribute) !== void 0 ? l.converter : Z;
      this._$Em = i;
      const c = h.fromAttribute(e, l.type);
      this[i] = c ?? ((r = this._$Ej) == null ? void 0 : r.get(i)) ?? c, this._$Em = null;
    }
  }
  requestUpdate(t, e, s, i = !1, o) {
    var r;
    if (t !== void 0) {
      const l = this.constructor;
      if (i === !1 && (o = this[t]), s ?? (s = l.getPropertyOptions(t)), !((s.hasChanged ?? $t)(o, e) || s.useDefault && s.reflect && o === ((r = this._$Ej) == null ? void 0 : r.get(t)) && !this.hasAttribute(l._$Eu(t, s)))) return;
      this.C(t, e, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: s, reflect: i, wrapped: o }, r) {
    s && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, r ?? e ?? this[t]), o !== !0 || r !== void 0) || (this._$AL.has(t) || (this.hasUpdated || s || (e = void 0), this._$AL.set(t, e)), i === !0 && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var s;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [o, r] of this._$Ep) this[o] = r;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [o, r] of i) {
        const { wrapped: l } = r, h = this[o];
        l !== !0 || this._$AL.has(o) || h === void 0 || this.C(o, void 0, r, h);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (s = this._$EO) == null || s.forEach((i) => {
        var o;
        return (o = i.hostUpdate) == null ? void 0 : o.call(i);
      }), this.update(e)) : this._$EM();
    } catch (i) {
      throw t = !1, this._$EM(), i;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var e;
    (e = this._$EO) == null || e.forEach((s) => {
      var i;
      return (i = s.hostUpdated) == null ? void 0 : i.call(s);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
C.elementStyles = [], C.shadowRootOptions = { mode: "open" }, C[U("elementProperties")] = /* @__PURE__ */ new Map(), C[U("finalized")] = /* @__PURE__ */ new Map(), W == null || W({ ReactiveElement: C }), (_.reactiveElementVersions ?? (_.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const O = globalThis, ot = (n) => n, D = O.trustedTypes, rt = D ? D.createPolicy("lit-html", { createHTML: (n) => n }) : void 0, gt = "$lit$", m = `lit$${Math.random().toFixed(9).slice(2)}$`, ft = "?" + m, Ot = `<${ft}>`, w = document, H = () => w.createComment(""), N = (n) => n === null || typeof n != "object" && typeof n != "function", Y = Array.isArray, Mt = (n) => Y(n) || typeof (n == null ? void 0 : n[Symbol.iterator]) == "function", q = `[ 	
\f\r]`, k = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ht = /-->/g, lt = />/g, b = RegExp(`>|${q}(?:([^\\s"'>=/]+)(${q}*=${q}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), at = /'/g, ct = /"/g, mt = /^(?:script|style|textarea|title)$/i, Tt = (n) => (t, ...e) => ({ _$litType$: n, strings: t, values: e }), g = Tt(1), x = Symbol.for("lit-noChange"), d = Symbol.for("lit-nothing"), dt = /* @__PURE__ */ new WeakMap(), v = w.createTreeWalker(w, 129);
function _t(n, t) {
  if (!Y(n) || !n.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return rt !== void 0 ? rt.createHTML(t) : t;
}
const Ht = (n, t) => {
  const e = n.length - 1, s = [];
  let i, o = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", r = k;
  for (let l = 0; l < e; l++) {
    const h = n[l];
    let c, u, a = -1, $ = 0;
    for (; $ < h.length && (r.lastIndex = $, u = r.exec(h), u !== null); ) $ = r.lastIndex, r === k ? u[1] === "!--" ? r = ht : u[1] !== void 0 ? r = lt : u[2] !== void 0 ? (mt.test(u[2]) && (i = RegExp("</" + u[2], "g")), r = b) : u[3] !== void 0 && (r = b) : r === b ? u[0] === ">" ? (r = i ?? k, a = -1) : u[1] === void 0 ? a = -2 : (a = r.lastIndex - u[2].length, c = u[1], r = u[3] === void 0 ? b : u[3] === '"' ? ct : at) : r === ct || r === at ? r = b : r === ht || r === lt ? r = k : (r = b, i = void 0);
    const p = r === b && n[l + 1].startsWith("/>") ? " " : "";
    o += r === k ? h + Ot : a >= 0 ? (s.push(c), h.slice(0, a) + gt + h.slice(a) + m + p) : h + m + (a === -2 ? l : p);
  }
  return [_t(n, o + (n[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), s];
};
class L {
  constructor({ strings: t, _$litType$: e }, s) {
    let i;
    this.parts = [];
    let o = 0, r = 0;
    const l = t.length - 1, h = this.parts, [c, u] = Ht(t, e);
    if (this.el = L.createElement(c, s), v.currentNode = this.el.content, e === 2 || e === 3) {
      const a = this.el.content.firstChild;
      a.replaceWith(...a.childNodes);
    }
    for (; (i = v.nextNode()) !== null && h.length < l; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const a of i.getAttributeNames()) if (a.endsWith(gt)) {
          const $ = u[r++], p = i.getAttribute(a).split(m), f = /([.?@])?(.*)/.exec($);
          h.push({ type: 1, index: o, name: f[2], strings: p, ctor: f[1] === "." ? Lt : f[1] === "?" ? Rt : f[1] === "@" ? zt : I }), i.removeAttribute(a);
        } else a.startsWith(m) && (h.push({ type: 6, index: o }), i.removeAttribute(a));
        if (mt.test(i.tagName)) {
          const a = i.textContent.split(m), $ = a.length - 1;
          if ($ > 0) {
            i.textContent = D ? D.emptyScript : "";
            for (let p = 0; p < $; p++) i.append(a[p], H()), v.nextNode(), h.push({ type: 2, index: ++o });
            i.append(a[$], H());
          }
        }
      } else if (i.nodeType === 8) if (i.data === ft) h.push({ type: 2, index: o });
      else {
        let a = -1;
        for (; (a = i.data.indexOf(m, a + 1)) !== -1; ) h.push({ type: 7, index: o }), a += m.length - 1;
      }
      o++;
    }
  }
  static createElement(t, e) {
    const s = w.createElement("template");
    return s.innerHTML = t, s;
  }
}
function P(n, t, e = n, s) {
  var r, l;
  if (t === x) return t;
  let i = s !== void 0 ? (r = e._$Co) == null ? void 0 : r[s] : e._$Cl;
  const o = N(t) ? void 0 : t._$litDirective$;
  return (i == null ? void 0 : i.constructor) !== o && ((l = i == null ? void 0 : i._$AO) == null || l.call(i, !1), o === void 0 ? i = void 0 : (i = new o(n), i._$AT(n, e, s)), s !== void 0 ? (e._$Co ?? (e._$Co = []))[s] = i : e._$Cl = i), i !== void 0 && (t = P(n, i._$AS(n, t.values), i, s)), t;
}
class Nt {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: s } = this._$AD, i = ((t == null ? void 0 : t.creationScope) ?? w).importNode(e, !0);
    v.currentNode = i;
    let o = v.nextNode(), r = 0, l = 0, h = s[0];
    for (; h !== void 0; ) {
      if (r === h.index) {
        let c;
        h.type === 2 ? c = new R(o, o.nextSibling, this, t) : h.type === 1 ? c = new h.ctor(o, h.name, h.strings, this, t) : h.type === 6 && (c = new jt(o, this, t)), this._$AV.push(c), h = s[++l];
      }
      r !== (h == null ? void 0 : h.index) && (o = v.nextNode(), r++);
    }
    return v.currentNode = w, i;
  }
  p(t) {
    let e = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(t, s, e), e += s.strings.length - 2) : s._$AI(t[e])), e++;
  }
}
class R {
  get _$AU() {
    var t;
    return ((t = this._$AM) == null ? void 0 : t._$AU) ?? this._$Cv;
  }
  constructor(t, e, s, i) {
    this.type = 2, this._$AH = d, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = i, this._$Cv = (i == null ? void 0 : i.isConnected) ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = P(this, t, e), N(t) ? t === d || t == null || t === "" ? (this._$AH !== d && this._$AR(), this._$AH = d) : t !== this._$AH && t !== x && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : Mt(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== d && N(this._$AH) ? this._$AA.nextSibling.data = t : this.T(w.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var o;
    const { values: e, _$litType$: s } = t, i = typeof s == "number" ? this._$AC(t) : (s.el === void 0 && (s.el = L.createElement(_t(s.h, s.h[0]), this.options)), s);
    if (((o = this._$AH) == null ? void 0 : o._$AD) === i) this._$AH.p(e);
    else {
      const r = new Nt(i, this), l = r.u(this.options);
      r.p(e), this.T(l), this._$AH = r;
    }
  }
  _$AC(t) {
    let e = dt.get(t.strings);
    return e === void 0 && dt.set(t.strings, e = new L(t)), e;
  }
  k(t) {
    Y(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s, i = 0;
    for (const o of t) i === e.length ? e.push(s = new R(this.O(H()), this.O(H()), this, this.options)) : s = e[i], s._$AI(o), i++;
    i < e.length && (this._$AR(s && s._$AB.nextSibling, i), e.length = i);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var s;
    for ((s = this._$AP) == null ? void 0 : s.call(this, !1, !0, e); t !== this._$AB; ) {
      const i = ot(t).nextSibling;
      ot(t).remove(), t = i;
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 && (this._$Cv = t, (e = this._$AP) == null || e.call(this, t));
  }
}
class I {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s, i, o) {
    this.type = 1, this._$AH = d, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i, this.options = o, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = d;
  }
  _$AI(t, e = this, s, i) {
    const o = this.strings;
    let r = !1;
    if (o === void 0) t = P(this, t, e, 0), r = !N(t) || t !== this._$AH && t !== x, r && (this._$AH = t);
    else {
      const l = t;
      let h, c;
      for (t = o[0], h = 0; h < o.length - 1; h++) c = P(this, l[s + h], e, h), c === x && (c = this._$AH[h]), r || (r = !N(c) || c !== this._$AH[h]), c === d ? t = d : t !== d && (t += (c ?? "") + o[h + 1]), this._$AH[h] = c;
    }
    r && !i && this.j(t);
  }
  j(t) {
    t === d ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Lt extends I {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === d ? void 0 : t;
  }
}
class Rt extends I {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== d);
  }
}
class zt extends I {
  constructor(t, e, s, i, o) {
    super(t, e, s, i, o), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = P(this, t, e, 0) ?? d) === x) return;
    const s = this._$AH, i = t === d && s !== d || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, o = t !== d && (s === d || i);
    i && this.element.removeEventListener(this.name, this, s), o && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var e;
    typeof this._$AH == "function" ? this._$AH.call(((e = this.options) == null ? void 0 : e.host) ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class jt {
  constructor(t, e, s) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    P(this, t);
  }
}
const V = O.litHtmlPolyfillSupport;
V == null || V(L, R), (O.litHtmlVersions ?? (O.litHtmlVersions = [])).push("3.3.3");
const Dt = (n, t, e) => {
  const s = (e == null ? void 0 : e.renderBefore) ?? t;
  let i = s._$litPart$;
  if (i === void 0) {
    const o = (e == null ? void 0 : e.renderBefore) ?? null;
    s._$litPart$ = i = new R(t.insertBefore(H(), o), o, void 0, e ?? {});
  }
  return i._$AI(n), i;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const S = globalThis;
let E = class extends C {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = Dt(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this._$Do) == null || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this._$Do) == null || t.setConnected(!1);
  }
  render() {
    return x;
  }
};
var ut;
E._$litElement$ = !0, E.finalized = !0, (ut = S.litElementHydrateSupport) == null || ut.call(S, { LitElement: E });
const K = S.litElementPolyfillSupport;
K == null || K({ LitElement: E });
(S.litElementVersions ?? (S.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Bt = { CHILD: 2 }, It = (n) => (...t) => ({ _$litDirective$: n, values: t });
class Wt {
  constructor(t) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t, e, s) {
    this._$Ct = t, this._$AM = e, this._$Ci = s;
  }
  _$AS(t, e) {
    return this.update(t, e);
  }
  update(t, e) {
    return this.render(...e);
  }
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class F extends Wt {
  constructor(t) {
    if (super(t), this.it = d, t.type !== Bt.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
  }
  render(t) {
    if (t === d || t == null) return this._t = void 0, this.it = t;
    if (t === x) return t;
    if (typeof t != "string") throw Error(this.constructor.directiveName + "() called with a non-string value");
    if (t === this.it) return this._t;
    this.it = t;
    const e = [t];
    return e.raw = e, this._t = { _$litType$: this.constructor.resultType, strings: e, values: [] };
  }
}
F.directiveName = "unsafeHTML", F.resultType = 1;
const B = It(F);
function qt(n, t = {}) {
  if (n === "xs")
    return "--button-padding-y: 0.28rem; --button-padding-x: 0.65rem; --button-font-size: 0.78rem;";
  if (n === "sm")
    return "--button-padding-y: 0.4rem; --button-padding-x: 0.8rem; --button-font-size: 0.85rem;";
  if (n === "m")
    return "--button-padding-y: 0.58rem; --button-padding-x: 1rem; --button-font-size: 0.95rem;";
  if (n === "l")
    return "--button-padding-y: 0.72rem; --button-padding-x: 1.25rem; --button-font-size: 1.05rem;";
  if (n === "xl")
    return "--button-padding-y: 1.6rem; --button-padding-x: 2rem; --button-font-size: 1.5rem;";
  const e = t.buttonPaddingTop || "0.58rem", s = t.buttonPaddingRight || "1rem", i = t.buttonPaddingBottom || "0.58rem", o = t.buttonPaddingLeft || "1rem";
  return `--button-padding-y: ${e}; --button-padding-x: ${s}; --button-font-size: 0.95rem; padding: ${e} ${s} ${i} ${o};`;
}
function Vt(n, t) {
  return n === "rounded" ? "9999px" : n === "square" ? "0px" : t || "12px";
}
function Kt({
  content: n,
  link: t,
  theme: e,
  variant: s,
  sizeStyle: i,
  radius: o,
  buttonType: r,
  preventEmptyLink: l = !1
}) {
  return r === "submit" || r === "button" ? g`<button
      class="site-button theme-${e} variant-${s}"
      type=${r}
      style=${`${i} --button-radius: ${o};`}
    >
      ${n || "Button"}
    </button>` : g`<a
    class="site-button theme-${e} variant-${s}"
    href=${t || "#"}
    style=${`${i} --button-radius: ${o};`}
    @click=${(h) => {
    l && !t && h.preventDefault();
  }}
    >${n || "Button"}</a
  >`;
}
const A = class A extends E {
  constructor() {
    super(), this.content = "Button", this.settings = {}, this.node = null, this.pageConfig = null;
  }
  updated(t) {
    var e, s;
    super.updated(t), (s = (e = A.editorPlugin) == null ? void 0 : e.onUpdated) == null || s.call(e, this, t);
  }
  render() {
    const t = this.settings ?? {}, e = this.content ?? "Button", s = String(t.buttonLink || "").trim(), i = String(t.buttonSize || "m"), o = String(t.buttonTheme || "primary"), r = String(t.buttonVariant || "filled"), l = String(t.buttonType || "link"), h = String(t.buttonShape || "rounded"), c = String(t.buttonRadiusCustom || "12px"), u = String(t.customCss || "").trim(), a = qt(i, t), $ = Vt(h, c), p = A.editorPlugin !== null;
    return g`
      <link rel="stylesheet" href="/owb-styles/button.css" />
      ${u ? B(`<style>${u}</style>`) : null}
      <div
        class="button-block${p && this.isSettingsEditorOpen ? " is-settings-open" : ""}"
        data-editor-block=${p || void 0}
        @pointerdown=${p ? () => {
      var f, tt;
      return (tt = (f = A.editorPlugin) == null ? void 0 : f.onPointerDown) == null ? void 0 : tt.call(f, this);
    } : void 0}
      >
        <div class="button-preview-wrap">
          ${Kt({
      content: e,
      link: s,
      theme: o,
      variant: r,
      sizeStyle: a,
      radius: $,
      buttonType: l,
      preventEmptyLink: p
    })}
        </div>
      </div>
    `;
  }
};
y(A, "editorPlugin", null), y(A, "properties", {
  // Content and settings — set by the publish pipeline or editor plugin
  content: { type: String },
  settings: { type: Object },
  // Editor-facing props — declared here so the editor plugin can set them;
  // harmless in the published bundle where they are never assigned.
  node: { type: Object },
  pageConfig: { type: Object }
});
let J = A;
function Zt(n) {
  var e;
  const t = String(n ?? "");
  try {
    const s = document.createElement("template");
    return (e = s.content) != null && e.querySelectorAll ? (s.innerHTML = t, s.content.querySelectorAll("a").forEach((o) => {
      o.removeAttribute("target"), o.removeAttribute("rel");
    }), s.innerHTML) : t;
  } catch {
    return t;
  }
}
const M = class M extends E {
  constructor() {
    super(), this.content = "", this.settings = {}, this.node = null, this.pageConfig = null;
  }
  updated(t) {
    var e, s;
    super.updated(t), (s = (e = M.editorPlugin) == null ? void 0 : e.onUpdated) == null || s.call(e, this, t);
  }
  render() {
    const t = this.content ?? "", e = this.settings ?? {}, s = String(e.customCss || "").trim(), i = Zt(t);
    return g`
      <link rel="stylesheet" href="/owb-styles/text.css" />
      ${s ? B(`<style>${s}</style>`) : null}
      <div class="text-block ProseMirror">${B(i)}</div>
    `;
  }
};
y(M, "editorPlugin", null), y(M, "properties", {
  content: { type: String },
  settings: { type: Object },
  node: { type: Object },
  pageConfig: { type: Object }
});
let G = M;
function Ft(n) {
  const t = String(n);
  return t === "full-width" || t === "contained" || t === "cover" ? t : "contained";
}
function z(n, t) {
  return n ? g`<div class="image-frame size-${t}">
    <img src=${n} alt="" loading="lazy" />
  </div>` : g`<div class="image-frame size-${t}"></div>`;
}
const T = class T extends E {
  constructor() {
    super(), this.url = "", this.settings = {}, this.node = null, this.pageConfig = null, this.lightboxOpen = !1, this.onWindowKeydown = this.onWindowKeydown.bind(this);
  }
  connectedCallback() {
    super.connectedCallback(), window.addEventListener("keydown", this.onWindowKeydown);
  }
  disconnectedCallback() {
    window.removeEventListener("keydown", this.onWindowKeydown), super.disconnectedCallback();
  }
  onWindowKeydown(t) {
    this.lightboxOpen && t.key === "Escape" && (this.lightboxOpen = !1);
  }
  openLightbox() {
    this.lightboxOpen = !0;
  }
  closeLightbox() {
    this.lightboxOpen = !1;
  }
  updated(t) {
    var e, s;
    super.updated(t), (s = (e = T.editorPlugin) == null ? void 0 : e.onUpdated) == null || s.call(e, this, t);
  }
  renderImageWithAction(t, e, s, i, o) {
    const r = s === "link" || s === "lightbox" ? s : "none";
    if (r === "link") {
      const l = String(i || "").trim();
      if (!l)
        return z(t, e);
      const h = o === "new" ? "_blank" : "_self";
      return g`<a
        class="image-action-link"
        href=${l}
        target=${h}
        rel=${h === "_blank" ? "noopener noreferrer" : null}
      >
        ${z(t, e)}
      </a>`;
    }
    return r === "lightbox" && t ? g`<button
        class="image-lightbox-trigger"
        type="button"
        @click=${() => this.openLightbox()}
      >
        ${z(t, e)}
      </button>` : z(t, e);
  }
  render() {
    const t = this.url ?? "", e = this.settings ?? {}, s = Ft((e == null ? void 0 : e.imageSizeMode) || "contained"), i = String((e == null ? void 0 : e.customCss) || "").trim(), o = String((e == null ? void 0 : e.imageClickAction) || "none"), r = String((e == null ? void 0 : e.imageLinkUrl) || "").trim(), l = String((e == null ? void 0 : e.imageLinkTarget) || "current");
    return g`
      <link rel="stylesheet" href="/owb-styles/image.css" />
      ${i ? B(`<style>${i}</style>`) : null}
      <div class="image-block size-${s}">
        ${this.renderImageWithAction(
      t,
      s,
      o,
      r,
      l
    )}
      </div>
      ${this.lightboxOpen && t ? g`
            <div class="image-lightbox" @click=${() => this.closeLightbox()}>
              <button
                class="image-lightbox-close"
                type="button"
                aria-label="Close image"
                @click=${(h) => {
      h.stopPropagation(), this.closeLightbox();
    }}
              >
                x
              </button>
              <img class="image-lightbox-image" src=${t} alt="" />
            </div>
          ` : null}
    `;
  }
};
y(T, "editorPlugin", null), y(T, "properties", {
  url: { type: String },
  settings: { type: Object },
  node: { type: Object },
  pageConfig: { type: Object },
  lightboxOpen: { state: !0 }
});
let Q = T;
customElements.get("owb-button") || customElements.define("owb-button", J);
customElements.get("owb-text") || customElements.define("owb-text", G);
customElements.get("owb-image") || customElements.define("owb-image", Q);
