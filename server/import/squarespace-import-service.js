import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";

const REPORT_DIR = "import-reports";
const IMPORTED_IMAGES_DIR = "images/imported";
const IMPORTED_STYLES_DIR = "styles/imported";
const ASSET_MANIFEST_NAME = ".import-manifest.json";

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function toText(value) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value && typeof value === "object") {
    if (typeof value["#text"] === "string") {
      return value["#text"];
    }
    if (typeof value._text === "string") {
      return value._text;
    }
  }
  return "";
}

function sanitizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toTitle(value) {
  const clean = String(value || "").trim();
  return clean || "Untitled";
}

function toJsonString(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function exists(filePath) {
  try {
    const result = await stat(filePath);
    return result.isFile();
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function readJsonSafe(filePath, fallback) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function nextAvailableId(dirPath, initialId) {
  const safeInitial = sanitizeId(initialId) || `item-${Date.now()}`;
  let candidate = safeInitial;
  let counter = 2;
  while (await exists(resolve(dirPath, `${candidate}.json`))) {
    candidate = `${safeInitial}-${counter}`;
    counter += 1;
  }
  return candidate;
}

function extractCategories(item) {
  const categories = asArray(item?.category)
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          text: entry,
          nicename: "",
          domain: "",
        };
      }

      const text = toText(entry).trim();
      return {
        text,
        nicename: String(entry?.nicename || "").trim(),
        domain: String(entry?.domain || "").trim(),
      };
    })
    .filter((entry) => entry.text || entry.nicename);

  return categories;
}

function buildMetadata(item) {
  const categories = extractCategories(item);
  const tags = categories
    .filter((entry) => entry.domain === "post_tag")
    .map((entry) => entry.text || entry.nicename)
    .filter(Boolean);

  const postCategories = categories
    .filter((entry) => entry.domain === "category")
    .map((entry) => entry.text || entry.nicename)
    .filter(Boolean);

  const excerpt = toText(item?.["excerpt:encoded"] || "").trim();

  return {
    sourceUrl: toText(item?.link).trim(),
    sourceGuid: toText(item?.guid).trim(),
    sourcePostId: toText(item?.["wp:post_id"]).trim(),
    excerpt,
    slug: toText(item?.["wp:post_name"]).trim(),
    status: toText(item?.["wp:status"]).trim(),
    publishedAt: toText(item?.pubDate).trim(),
    createdAt: toText(item?.["wp:post_date"]).trim(),
    postType: toText(item?.["wp:post_type"]).trim(),
    author: toText(item?.["dc:creator"]).trim(),
    commentStatus: toText(item?.["wp:comment_status"]).trim(),
    postDateGmt: toText(item?.["wp:post_date_gmt"]).trim(),
    tags,
    categories: postCategories,
  };
}

function extractBodyHtml(item) {
  const html = toText(item?.["content:encoded"]);
  return String(html || "").trim();
}

function ensureSection(content) {
  return {
    id: `section-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "section",
    content,
    settings: {},
  };
}

function makeTextNode(html) {
  return {
    id: `text-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "text",
    content: html,
    settings: {},
  };
}

function normalizeCssDeclaration(value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }
  return input.endsWith(";") ? input : `${input};`;
}

function extractTextNodeWithStyles($, nodeEl, scopedIndex) {
  const node = $(nodeEl).clone();
  const cssRules = [];
  let counter = 0;

  node.find("[style]").each((_, styled) => {
    const styleValue = normalizeCssDeclaration($(styled).attr("style"));
    if (!styleValue) {
      $(styled).removeAttr("style");
      return;
    }

    const className = `imp-s-${scopedIndex}-${counter}`;
    counter += 1;
    $(styled).addClass(className);
    $(styled).removeAttr("style");
    cssRules.push(`.${className} { ${styleValue} }`);
  });

  const rootStyle = normalizeCssDeclaration(node.attr("style"));
  if (rootStyle) {
    const rootClass = `imp-s-${scopedIndex}-root`;
    node.addClass(rootClass);
    node.removeAttr("style");
    cssRules.push(`.${rootClass} { ${rootStyle} }`);
  }

  const contentHtml = $.html(node) || "";
  const textNode = makeTextNode(contentHtml);
  if (cssRules.length > 0) {
    textNode.settings = {
      customCss: `${cssRules.join("\n")}\n`,
    };
  }

  return textNode;
}

function makeEmbedNode(html) {
  return {
    id: `embed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "embed",
    html,
    settings: {},
  };
}

function makeButtonNode(label, href) {
  return {
    id: `button-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "button",
    content: label || "Button",
    settings: {
      buttonLink: href || "",
    },
  };
}

function makeGalleryNode(images) {
  return {
    id: `gallery-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "gallery",
    images,
    settings: {},
  };
}

function makeImageNode(url) {
  return {
    id: `image-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "image",
    url,
    settings: {},
  };
}

function getElementClassName($, element) {
  const raw = ($(element).attr("class") || "").trim();
  return raw || "";
}

function hasTextContent(html) {
  return (
    String(html || "")
      .replace(/<[^>]+>/g, "")
      .trim().length > 0
  );
}

function hashUrl(value) {
  return createHash("sha1")
    .update(String(value || ""))
    .digest("hex");
}

function normalizeFileNameFromUrl(urlValue) {
  try {
    const url = new URL(urlValue);
    const cleanName = basename(url.pathname).split("?")[0];
    const extension = extname(cleanName).toLowerCase();
    const safeBase = sanitizeId(cleanName.replace(/\.[^/.]+$/, "")) || "asset";
    const safeExt = extension || ".bin";
    return `${safeBase}${safeExt}`;
  } catch {
    const fallback = sanitizeId(String(urlValue || "")) || hashUrl(urlValue);
    return `${fallback}.bin`;
  }
}

async function loadAssetManifest(contentRoot) {
  const manifestPath = resolve(
    contentRoot,
    IMPORTED_IMAGES_DIR,
    ASSET_MANIFEST_NAME,
  );
  const manifest = await readJsonSafe(manifestPath, {
    version: 1,
    bySourceUrl: {},
  });

  if (!manifest || typeof manifest !== "object") {
    return {
      path: manifestPath,
      value: { version: 1, bySourceUrl: {} },
    };
  }

  if (!manifest.bySourceUrl || typeof manifest.bySourceUrl !== "object") {
    manifest.bySourceUrl = {};
  }

  return {
    path: manifestPath,
    value: manifest,
  };
}

async function persistAssetManifest(assetManifest) {
  await ensureDir(dirname(assetManifest.path));
  await writeFile(assetManifest.path, toJsonString(assetManifest.value));
}

function hasManifestCollision(assetManifest, currentUrl, localPath) {
  const bySourceUrl = assetManifest.value.bySourceUrl;
  for (const [url, entry] of Object.entries(bySourceUrl)) {
    if (url !== currentUrl && entry?.localPath === localPath) {
      return true;
    }
  }
  return false;
}

async function downloadAssetIfNeeded({
  sourceUrl,
  contentRoot,
  assetManifest,
  report,
}) {
  const trimmed = String(sourceUrl || "").trim();
  if (!trimmed) {
    return "";
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const known = assetManifest.value.bySourceUrl[trimmed];
  if (known?.localPath) {
    const knownAbsolute = resolve(
      contentRoot,
      known.localPath.replace(/^\//, ""),
    );
    if (await exists(knownAbsolute)) {
      // If another URL also maps to this same file it was a collision — clear
      // this entry so it gets re-derived with a unique hash-suffixed filename.
      if (hasManifestCollision(assetManifest, trimmed, known.localPath)) {
        delete assetManifest.value.bySourceUrl[trimmed];
        // Fall through to re-derive below
      } else {
        report.assets.push({
          sourceUrl: trimmed,
          localPath: known.localPath,
          status: "skipped-existing",
          reason: "manifest-hit",
        });
        return known.localPath;
      }
    }
  }

  const imagesDir = resolve(contentRoot, IMPORTED_IMAGES_DIR);
  await ensureDir(imagesDir);

  const baseFileName = normalizeFileNameFromUrl(trimmed);

  // If a file with the same base name already exists from a *different* URL,
  // append a short URL hash to avoid mapping this URL to the wrong image.
  let uniqueFileName = baseFileName;
  if (await exists(resolve(imagesDir, baseFileName))) {
    const urlHash = hashUrl(trimmed).slice(0, 8);
    const ext = extname(baseFileName);
    const base = ext ? baseFileName.slice(0, -ext.length) : baseFileName;
    uniqueFileName = `${base}-${urlHash}${ext}`;
  }

  const absoluteTargetPath = resolve(imagesDir, uniqueFileName);
  const relativeTargetPath = `/images/imported/${uniqueFileName}`;

  if (await exists(absoluteTargetPath)) {
    assetManifest.value.bySourceUrl[trimmed] = {
      localPath: relativeTargetPath,
      sourceHash: hashUrl(trimmed),
    };
    report.assets.push({
      sourceUrl: trimmed,
      localPath: relativeTargetPath,
      status: "skipped-existing",
      reason: "name-exists",
    });
    return relativeTargetPath;
  }

  try {
    const response = await fetch(trimmed);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(absoluteTargetPath, buffer);
    const fingerprint = createHash("sha1").update(buffer).digest("hex");

    assetManifest.value.bySourceUrl[trimmed] = {
      localPath: relativeTargetPath,
      sourceHash: hashUrl(trimmed),
      fingerprint,
    };

    report.assets.push({
      sourceUrl: trimmed,
      localPath: relativeTargetPath,
      status: "downloaded",
      reason: "new",
    });
    return relativeTargetPath;
  } catch (error) {
    report.assets.push({
      sourceUrl: trimmed,
      localPath: "",
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
    });
    report.issues.push({
      severity: "warning",
      type: "asset-download",
      message: `Failed to download asset: ${trimmed}`,
      details: error instanceof Error ? error.message : String(error),
    });
    return trimmed;
  }
}

function extractImageUrlCandidates($, element) {
  const urls = new Set();
  const root = $(element);

  const rootHref = root.attr("href") || "";
  const rootSrc =
    root.attr("src") ||
    root.attr("data-src") ||
    root.attr("data-image") ||
    root.attr("data-image-url") ||
    "";

  if (rootHref) {
    urls.add(rootHref);
  }
  if (rootSrc) {
    urls.add(rootSrc);
  }

  root
    .find("a[href], img[src], img[data-src], [data-image], [data-image-url]")
    .each((_, nested) => {
      const nestedEl = $(nested);
      const href = nestedEl.attr("href") || "";
      const src =
        nestedEl.attr("src") ||
        nestedEl.attr("data-src") ||
        nestedEl.attr("data-image") ||
        nestedEl.attr("data-image-url") ||
        "";
      if (href) {
        urls.add(href);
      }
      if (src) {
        urls.add(src);
      }
    });

  return Array.from(urls).filter((value) =>
    /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i.test(value),
  );
}

function collectMetaValues(item, metaKey) {
  const postmeta = asArray(item?.["wp:postmeta"]);
  return postmeta
    .filter((entry) => toText(entry?.["wp:meta_key"]).trim() === metaKey)
    .map((entry) => toText(entry?.["wp:meta_value"]).trim())
    .filter(Boolean);
}

function extractGlobalStyles($) {
  const styles = [];
  $("style").each((_, styleEl) => {
    const cssText = ($(styleEl).html() || "").trim();
    if (cssText) {
      styles.push(cssText);
    }
    $(styleEl).remove();
  });
  return styles;
}

async function writeGlobalStylesFile({ contentRoot, baseName, cssBlocks }) {
  const normalizedBlocks = asArray(cssBlocks)
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (normalizedBlocks.length === 0) {
    return "";
  }

  const stylesDir = resolve(contentRoot, IMPORTED_STYLES_DIR);
  await ensureDir(stylesDir);

  const safeBase = sanitizeId(baseName) || `import-${Date.now()}`;
  let fileName = `${safeBase}.css`;
  let absolutePath = resolve(stylesDir, fileName);
  let counter = 2;

  while (await exists(absolutePath)) {
    fileName = `${safeBase}-${counter}.css`;
    absolutePath = resolve(stylesDir, fileName);
    counter += 1;
  }

  await writeFile(absolutePath, `${normalizedBlocks.join("\n\n")}\n`);
  return `/styles/imported/${fileName}`;
}

async function mapHtmlToContent({ html, contentRoot, assetManifest, report }) {
  if (!html) {
    return {
      content: [],
      globalStyles: [],
    };
  }

  const $ = cheerio.load(html);
  const globalStyles = extractGlobalStyles($);
  const rootSections = $("section").toArray();

  const sectionSources =
    rootSections.length > 0
      ? rootSections.map((element) => ({
          context: $(element),
        }))
      : [{ context: $.root() }];
  const sectionElementByIndex = rootSections.length > 0 ? rootSections : [];
  const resultSections = [];
  let textStyleIndex = 0;

  for (const sectionSource of sectionSources) {
    const sectionNodes = [];
    const contextRoot = sectionSource.context;

    const galleryEls = contextRoot
      .find(".sqs-gallery, .sqs-block-gallery, .image-gallery-wrapper")
      .toArray();
    for (const galleryEl of galleryEls) {
      const galleryUrls = [];
      const galleryCandidates = extractImageUrlCandidates($, galleryEl);
      for (const src of galleryCandidates) {
        const localUrl = await downloadAssetIfNeeded({
          sourceUrl: src,
          contentRoot,
          assetManifest,
          report,
        });
        if (localUrl) {
          galleryUrls.push(localUrl);
        }
      }

      if (galleryUrls.length > 0) {
        const galleryNode = makeGalleryNode(galleryUrls);
        const galleryClass = getElementClassName($, galleryEl);
        if (galleryClass) {
          galleryNode.settings.className = galleryClass;
        }
        sectionNodes.push(galleryNode);
      }
    }

    const embedEls = contextRoot
      .find(".sqs-block-embed, iframe, .sqs-block-code")
      .toArray();
    for (const embedEl of embedEls) {
      const embedHtml = $.html(embedEl);
      if (embedHtml && embedHtml.trim()) {
        const embedNode = makeEmbedNode(embedHtml);
        const embedClass = getElementClassName($, embedEl);
        if (embedClass) {
          embedNode.settings.className = embedClass;
        }
        sectionNodes.push(embedNode);
      }
    }

    const buttonEls = contextRoot
      .find(".sqs-block-button a, a.sqs-block-button-element")
      .toArray();
    for (const buttonEl of buttonEls) {
      const href = $(buttonEl).attr("href") || "";
      const label = $(buttonEl).text().trim();
      const buttonNode = makeButtonNode(label, href);
      const buttonClass = getElementClassName($, buttonEl);
      if (buttonClass) {
        buttonNode.settings.className = buttonClass;
      }
      sectionNodes.push(buttonNode);
    }

    const socialRoot = contextRoot
      .find(".sqs-block-socialaccountlinks")
      .first();
    if (socialRoot.length) {
      const items = socialRoot
        .find("a")
        .toArray()
        .map((linkEl) => {
          const href = $(linkEl).attr("href") || "";
          const label = $(linkEl).attr("aria-label") || $(linkEl).text().trim();
          return {
            id: `social-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: label || "Social",
            link: href,
            icon: sanitizeId(label) || "globe",
          };
        })
        .filter((item) => item.link);

      if (items.length > 0) {
        const socialClass = getElementClassName($, socialRoot[0]);
        sectionNodes.push({
          id: `social-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: "social-media",
          items,
          settings: socialClass ? { className: socialClass } : {},
        });
      }
    }

    const imageEls = contextRoot.find("img").toArray();
    for (const imageEl of imageEls) {
      if (
        $(imageEl).closest(
          ".sqs-gallery, .sqs-block-gallery, .image-gallery-wrapper",
        ).length
      ) {
        continue;
      }

      const parentClass = (
        $(imageEl).parent().attr("class") || ""
      ).toLowerCase();
      if (parentClass.includes("gallery")) {
        continue;
      }

      const src = $(imageEl).attr("src") || "";
      const localUrl = await downloadAssetIfNeeded({
        sourceUrl: src,
        contentRoot,
        assetManifest,
        report,
      });
      if (localUrl) {
        const imageNode = makeImageNode(localUrl);
        const imageClass = getElementClassName($, imageEl);
        if (imageClass) {
          imageNode.settings.className = imageClass;
        }
        sectionNodes.push(imageNode);
      }
    }

    const textCandidates = contextRoot
      .find("h1, h2, h3, h4, h5, h6, p")
      .toArray();

    for (const textEl of textCandidates) {
      const textHtml = $.html(textEl) || "";
      if (hasTextContent(textHtml)) {
        const textNode = extractTextNodeWithStyles($, textEl, textStyleIndex);
        textStyleIndex += 1;
        const textClass = getElementClassName($, textEl);
        if (textClass) {
          if (!textNode.settings) {
            textNode.settings = {};
          }
          textNode.settings.className = textClass;
        }
        sectionNodes.push(textNode);
      }
    }

    if (sectionNodes.length === 0) {
      const fallbackHtml = contextRoot.html() || "";
      if (hasTextContent(fallbackHtml)) {
        sectionNodes.push(makeTextNode(fallbackHtml));
        report.issues.push({
          severity: "warning",
          type: "fallback-text",
          message: "Used fallback text mapping for a section.",
        });
      }
    }

    if (sectionNodes.length > 0) {
      const sectionEl = sectionElementByIndex[resultSections.length];
      const section = ensureSection(sectionNodes);
      if (sectionEl) {
        const sectionClass = getElementClassName($, sectionEl);
        if (sectionClass) {
          section.settings.className = sectionClass;
        }
      }
      resultSections.push(section);
    }
  }

  return {
    content: resultSections,
    globalStyles,
  };
}

async function ensureCollectionConfig(contentRoot, collectionId) {
  const collectionsDir = resolve(contentRoot, "collections");
  const collectionDir = resolve(collectionsDir, collectionId);
  await ensureDir(collectionDir);

  const configPath = resolve(collectionDir, "_config.json");
  if (await exists(configPath)) {
    return;
  }

  const config = {
    id: collectionId,
    title: toTitle(collectionId),
    fields: {
      title: { type: "string", required: true },
      content: { type: "array", required: true },
      metadata: { type: "object", required: false },
      seo: { type: "object", required: false },
      excerpt: { type: "string", required: false },
      tags: { type: "array", required: false },
    },
    metadataFields: {},
  };

  await writeFile(configPath, toJsonString(config));
}

function buildCollectionId(metadata) {
  const rawSourceUrl = String(metadata?.sourceUrl || "").trim();
  const pathValue = (() => {
    if (!rawSourceUrl) {
      return "";
    }

    try {
      const parsed = new URL(rawSourceUrl);
      return String(parsed.pathname || "").trim();
    } catch {
      return rawSourceUrl;
    }
  })();

  const sourceGroup = String(pathValue || "")
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .map((segment) => sanitizeId(segment))
    .find(Boolean);

  if (sourceGroup) {
    return sourceGroup;
  }

  const postType = sanitizeId(metadata?.postType);
  return postType || "posts";
}

async function copyLocalAssetIfNeeded({
  assetPath,
  contentRoot,
  assetManifest,
  report,
}) {
  const manifestKey = `file:${assetPath}`;
  const known = assetManifest.value.bySourceUrl[manifestKey];
  if (known?.localPath) {
    const knownAbsolute = resolve(
      contentRoot,
      known.localPath.replace(/^\//, ""),
    );
    if (await exists(knownAbsolute)) {
      report.assets.push({
        sourceUrl: manifestKey,
        localPath: known.localPath,
        status: "skipped-existing",
        reason: "manifest-hit",
      });
      return known.localPath;
    }
  }

  const imagesDir = resolve(contentRoot, IMPORTED_IMAGES_DIR);
  await ensureDir(imagesDir);

  const fileName = basename(assetPath);
  const absoluteTargetPath = resolve(imagesDir, fileName);
  const relativeTargetPath = `/images/imported/${fileName}`;

  if (await exists(absoluteTargetPath)) {
    assetManifest.value.bySourceUrl[manifestKey] = {
      localPath: relativeTargetPath,
    };
    report.assets.push({
      sourceUrl: manifestKey,
      localPath: relativeTargetPath,
      status: "skipped-existing",
      reason: "name-exists",
    });
    return relativeTargetPath;
  }

  try {
    const buffer = await readFile(assetPath);
    await writeFile(absoluteTargetPath, buffer);
    assetManifest.value.bySourceUrl[manifestKey] = {
      localPath: relativeTargetPath,
    };
    report.assets.push({
      sourceUrl: manifestKey,
      localPath: relativeTargetPath,
      status: "copied",
      reason: "new",
    });
    return relativeTargetPath;
  } catch (error) {
    report.assets.push({
      sourceUrl: manifestKey,
      localPath: "",
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
    });
    report.issues.push({
      severity: "warning",
      type: "asset-copy",
      message: `Failed to copy local asset: ${assetPath}`,
      details: error instanceof Error ? error.message : String(error),
    });
    return "";
  }
}

function extractSquarespaceContext(html) {
  const $ = cheerio.load(html);
  const scriptEl = $('script[data-name="static-context"]');
  if (!scriptEl.length) return null;

  const scriptContent = scriptEl.html() || "";
  const marker = "Static.SQUARESPACE_CONTEXT = ";
  const markerIdx = scriptContent.indexOf(marker);
  if (markerIdx === -1) return null;

  const jsonStart = scriptContent.indexOf("{", markerIdx + marker.length);
  if (jsonStart === -1) return null;

  const jsonStr = scriptContent.slice(jsonStart).replace(/;\s*$/, "");
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function is404Page(context) {
  return (
    context?.collection?.fullUrl === "/404-page-not-found" ||
    String(context?.collection?.title || "")
      .toLowerCase()
      .includes("page not found")
  );
}

const STATIC_SITE_SKIP_DIRS = new Set([
  "assets",
  "af",
  "css2",
  "gtag",
  "cart",
  "shop",
  "loc-bellemare-alford",
]);

async function findHtmlFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (STATIC_SITE_SKIP_DIRS.has(entry.name.toLowerCase())) {
        continue;
      }
      const subResults = await findHtmlFiles(resolve(dir, entry.name));
      results.push(...subResults);
    } else if (entry.isFile() && entry.name === "index.html") {
      results.push(resolve(dir, entry.name));
    }
  }
  return results;
}

async function mapStaticPageToContent({
  $,
  htmlDir,
  contentRoot,
  assetManifest,
  report,
}) {
  const resultSections = [];
  const pageSections = $(
    "main#page article.sections > section.page-section",
  ).toArray();

  if (pageSections.length === 0) {
    return resultSections;
  }

  for (const sectionEl of pageSections) {
    const sectionClass = ($(sectionEl).attr("class") || "").trim();
    const sectionNodes = [];
    const feBlocks = $(sectionEl).find(".fe-block").toArray();

    if (feBlocks.length > 0) {
      for (const blockEl of feBlocks) {
        // Text block
        const textBlockEl = $(blockEl)
          .find(".sqs-block-html .sqs-html-content")
          .first();
        if (textBlockEl.length) {
          const innerHtml = textBlockEl.html() || "";
          if (hasTextContent(innerHtml)) {
            sectionNodes.push(makeTextNode(innerHtml));
          }
          continue;
        }

        // Image block
        const imgEl = $(blockEl)
          .find(".fluid-image-container img, .sqs-block-image img")
          .first();
        if (imgEl.length) {
          const src = imgEl.attr("data-src") || imgEl.attr("src") || "";
          if (src) {
            let localUrl;
            if (/^https?:\/\//i.test(src)) {
              localUrl = await downloadAssetIfNeeded({
                sourceUrl: src,
                contentRoot,
                assetManifest,
                report,
              });
            } else {
              localUrl = await copyLocalAssetIfNeeded({
                assetPath: resolve(htmlDir, src),
                contentRoot,
                assetManifest,
                report,
              });
            }
            if (localUrl) {
              sectionNodes.push(makeImageNode(localUrl));
            }
          }
          continue;
        }

        // Embed block
        const embedEl = $(blockEl)
          .find(".sqs-block-embed, .sqs-block-code, iframe")
          .first();
        if (embedEl.length) {
          const embedHtml = $.html(embedEl);
          if (embedHtml && embedHtml.trim()) {
            sectionNodes.push(makeEmbedNode(embedHtml));
          }
          continue;
        }

        // Button block
        const btnEl = $(blockEl)
          .find(".sqs-block-button a, a.sqs-block-button-element")
          .first();
        if (btnEl.length) {
          const href = btnEl.attr("href") || "";
          const label = btnEl.text().trim();
          if (label || href) {
            sectionNodes.push(makeButtonNode(label, href));
          }
        }
      }
    } else if (sectionClass.includes("gallery-section")) {
      // Gallery album section — collect all unique gallery images
      const galleryImages = [];
      const seen = new Set();
      for (const imgEl of $(sectionEl).find("img[data-image]").toArray()) {
        const src =
          $(imgEl).attr("data-image") ||
          $(imgEl).attr("data-src") ||
          $(imgEl).attr("src") ||
          "";
        if (!src || seen.has(src)) continue;
        seen.add(src);
        let localUrl;
        if (/^https?:\/\//i.test(src)) {
          localUrl = await downloadAssetIfNeeded({
            sourceUrl: src,
            contentRoot,
            assetManifest,
            report,
          });
        } else {
          localUrl = await copyLocalAssetIfNeeded({
            assetPath: resolve(htmlDir, src),
            contentRoot,
            assetManifest,
            report,
          });
        }
        if (localUrl) {
          galleryImages.push(localUrl);
        }
      }
      if (galleryImages.length > 0) {
        sectionNodes.push(makeGalleryNode(galleryImages));
      }
    } else {
      // Fallback: older layout without .fe-block wrappers
      for (const textEl of $(sectionEl).find(".sqs-html-content").toArray()) {
        const innerHtml = $(textEl).html() || "";
        if (hasTextContent(innerHtml)) {
          sectionNodes.push(makeTextNode(innerHtml));
        }
      }
      for (const imgEl of $(sectionEl).find(".sqs-block-image img").toArray()) {
        const src = $(imgEl).attr("data-src") || $(imgEl).attr("src") || "";
        if (!src) continue;
        let localUrl;
        if (/^https?:\/\//i.test(src)) {
          localUrl = await downloadAssetIfNeeded({
            sourceUrl: src,
            contentRoot,
            assetManifest,
            report,
          });
        } else {
          localUrl = await copyLocalAssetIfNeeded({
            assetPath: resolve(htmlDir, src),
            contentRoot,
            assetManifest,
            report,
          });
        }
        if (localUrl) {
          sectionNodes.push(makeImageNode(localUrl));
        }
      }
    }

    if (sectionNodes.length > 0) {
      const section = ensureSection(sectionNodes);
      if (sectionClass) {
        section.settings.className = sectionClass;
      }
      resultSections.push(section);
    }
  }

  return resultSections;
}

async function buildPageFromStaticHtml({
  htmlContent,
  htmlFilePath,
  contentRoot,
  assetManifest,
  report,
}) {
  const context = extractSquarespaceContext(htmlContent);
  if (!context) {
    report.issues.push({
      severity: "info",
      type: "html-import",
      message: `No SQUARESPACE_CONTEXT found in ${htmlFilePath} — skipped`,
    });
    return null;
  }

  if (is404Page(context)) {
    report.issues.push({
      severity: "info",
      type: "html-import",
      message: `404 page at ${htmlFilePath} (url: ${context?.collection?.fullUrl}) — skipped`,
    });
    return null;
  }

  // Gallery album pages (pageType 50) have the real URL in item.fullUrl
  const itemFullUrl = context?.item?.fullUrl;
  const isGalleryItem = !!(
    itemFullUrl && itemFullUrl !== context?.collection?.fullUrl
  );
  const fullUrl = String(
    (isGalleryItem ? itemFullUrl : context?.collection?.fullUrl) || "/",
  ).trim();
  const title = toTitle(
    (isGalleryItem ? context?.item?.title : context?.collection?.title) || "",
  );
  const htmlDir = dirname(htmlFilePath);

  const $ = cheerio.load(htmlContent);
  const seoDescription = String(
    $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "",
  ).trim();

  const content = await mapStaticPageToContent({
    $,
    htmlDir,
    contentRoot,
    assetManifest,
    report,
  });

  if (content.length === 0) {
    report.issues.push({
      severity: "info",
      type: "html-import",
      message: `No page sections found in ${htmlFilePath} (url: ${fullUrl}) — skipped`,
    });
    return null;
  }

  const slug =
    sanitizeId(fullUrl.replace(/^\//, "").replace(/\//g, "-")) ||
    sanitizeId(basename(htmlDir)) ||
    "page";

  return {
    slug,
    page: {
      type: "page",
      id: slug,
      title,
      url: fullUrl,
      seo: {
        title,
        description: seoDescription,
        image: "",
        noIndex: false,
      },
      metadata: {
        sourceUrl: fullUrl,
        slug,
        status: "publish",
      },
      content,
    },
  };
}

async function writeReport(contentRoot, report) {
  const reportsDir = resolve(contentRoot, REPORT_DIR);
  await ensureDir(reportsDir);
  const fileName = `squarespace-import-${nowStamp()}.json`;
  const absolutePath = resolve(reportsDir, fileName);
  const relativePath = `/import-reports/${fileName}`;
  await writeFile(absolutePath, toJsonString(report));
  return relativePath;
}

export async function importSquarespaceXml({
  xmlContent,
  sourceName,
  options,
  contentRoot,
}) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: false,
  });

  if (!String(xmlContent || "").trim()) {
    throw new Error("XML content is required");
  }

  const parsed = parser.parse(String(xmlContent));
  const channel = parsed?.rss?.channel;
  const rawItems = asArray(channel?.item);

  const attachmentById = new Map();
  for (const item of rawItems) {
    const postType = sanitizeId(toText(item?.["wp:post_type"]).trim());
    if (postType !== "attachment") {
      continue;
    }

    const attachmentId = toText(item?.["wp:post_id"]).trim();
    const attachmentUrl =
      toText(item?.["wp:attachment_url"]).trim() || toText(item?.link).trim();
    if (!attachmentId || !attachmentUrl) {
      continue;
    }

    attachmentById.set(attachmentId, attachmentUrl);
  }

  const report = {
    sourceName: sourceName || "unknown.xml",
    createdAt: new Date().toISOString(),
    options: options || {},
    summary: {
      totalItems: rawItems.length,
      pagesCreated: 0,
      collectionItemsCreated: 0,
      attachmentsSkipped: 0,
      globalCssFilesCreated: 0,
      assetsDownloaded: 0,
      assetsSkipped: 0,
      assetsFailed: 0,
      warnings: 0,
      errors: 0,
    },
    items: [],
    assets: [],
    issues: [],
  };

  const assetManifest = await loadAssetManifest(contentRoot);

  const pagesDir = resolve(contentRoot, "pages");
  await ensureDir(pagesDir);

  for (const item of rawItems) {
    const title = toTitle(toText(item?.title));
    const metadata = buildMetadata(item);
    const postType = sanitizeId(metadata.postType) || "post";
    const importedUrl = toText(item?.link).trim() || "/";

    if (postType === "attachment") {
      report.summary.attachmentsSkipped += 1;
      report.items.push({
        title,
        postType,
        destination: "",
        status: "skipped-attachment",
      });
      continue;
    }

    const bodyHtml = extractBodyHtml(item);
    const parsedUrlPath = (() => {
      try {
        const url = new URL(importedUrl);
        return url.pathname || "/";
      } catch {
        return importedUrl;
      }
    })();

    const mapped = await mapHtmlToContent({
      html: bodyHtml,
      contentRoot,
      assetManifest,
      report,
    });

    const content = mapped.content;
    const thumbnailIds = collectMetaValues(item, "_thumbnail_id");
    const attachmentSourceUrl = thumbnailIds
      .map((id) => attachmentById.get(id))
      .find(Boolean);

    if (attachmentSourceUrl) {
      const featuredImageUrl = await downloadAssetIfNeeded({
        sourceUrl: attachmentSourceUrl,
        contentRoot,
        assetManifest,
        report,
      });
      if (featuredImageUrl) {
        metadata.featuredImageUrl = featuredImageUrl;
      }
    }

    const globalCssPath =
      options?.createCssFiles !== false
        ? await writeGlobalStylesFile({
            contentRoot,
            baseName: parsedUrlPath || title,
            cssBlocks: mapped.globalStyles,
          })
        : "";

    if (globalCssPath) {
      metadata.globalCssFiles = [globalCssPath];
      report.summary.globalCssFilesCreated += 1;
    }

    const seo = {
      title,
      description: metadata.excerpt || "",
      image: metadata.featuredImageUrl || "",
      noIndex: false,
    };

    if (postType === "page") {
      const slugBase = sanitizeId(parsedUrlPath || title) || "page";
      const existingPath = resolve(pagesDir, `${slugBase}.json`);
      let pageId = slugBase;
      let pageContent = content;
      let isUpdate = false;

      if (await exists(existingPath)) {
        const existing = await readJsonSafe(existingPath, null);
        if (existing) {
          pageContent = Array.isArray(existing.content)
            ? existing.content
            : content;
          isUpdate = true;
        }
      } else {
        pageId = await nextAvailableId(pagesDir, slugBase);
      }

      const pagePayload = {
        type: "page",
        id: pageId,
        title,
        url: parsedUrlPath || `/${pageId}`,
        seo,
        metadata,
        content: pageContent,
      };

      await writeFile(
        resolve(pagesDir, `${pageId}.json`),
        toJsonString(pagePayload),
      );
      if (isUpdate) {
        report.summary.pagesUpdated = (report.summary.pagesUpdated || 0) + 1;
      } else {
        report.summary.pagesCreated += 1;
      }
      report.items.push({
        title,
        postType,
        destination: `pages/${pageId}.json`,
        status: isUpdate ? "updated" : "imported",
      });
      continue;
    }

    const collectionId = buildCollectionId(metadata);
    await ensureCollectionConfig(contentRoot, collectionId);
    const collectionDir = resolve(contentRoot, "collections", collectionId);
    const itemBase =
      sanitizeId(parsedUrlPath || title || `item-${Date.now()}`) || "item";
    const existingItemPath = resolve(collectionDir, `${itemBase}.json`);
    let itemId = itemBase;
    let itemContent = content;
    let isItemUpdate = false;

    if (await exists(existingItemPath)) {
      const existing = await readJsonSafe(existingItemPath, null);
      if (existing) {
        itemContent = Array.isArray(existing.content)
          ? existing.content
          : content;
        isItemUpdate = true;
      }
    } else {
      itemId = await nextAvailableId(collectionDir, itemBase);
    }

    const itemPayload = {
      id: itemId,
      title,
      url: parsedUrlPath || `/${collectionId}/${itemId}`,
      excerpt: metadata.excerpt || "",
      tags: metadata.tags || [],
      seo,
      metadata,
      content: itemContent,
    };

    await writeFile(
      resolve(collectionDir, `${itemId}.json`),
      toJsonString(itemPayload),
    );
    if (isItemUpdate) {
      report.summary.collectionItemsUpdated =
        (report.summary.collectionItemsUpdated || 0) + 1;
    } else {
      report.summary.collectionItemsCreated += 1;
    }
    report.items.push({
      title,
      postType,
      destination: `collections/${collectionId}/${itemId}.json`,
      status: isItemUpdate ? "updated" : "imported",
    });
  }

  await persistAssetManifest(assetManifest);

  report.summary.assetsDownloaded = report.assets.filter(
    (entry) => entry.status === "downloaded",
  ).length;
  report.summary.assetsSkipped = report.assets.filter(
    (entry) => entry.status === "skipped-existing",
  ).length;
  report.summary.assetsFailed = report.assets.filter(
    (entry) => entry.status === "failed",
  ).length;
  report.summary.warnings = report.issues.filter(
    (entry) => entry.severity === "warning",
  ).length;
  report.summary.errors = report.issues.filter(
    (entry) => entry.severity === "error",
  ).length;

  const reportPath = await writeReport(contentRoot, report);

  return {
    ok: true,
    summary: report.summary,
    reportPath,
    items: report.items,
    assets: report.assets,
  };
}

export async function importSquarespaceStaticSiteDir({
  staticSiteDir,
  htmlContent,
  fileName,
  options,
  contentRoot,
}) {
  const sourceName = htmlContent
    ? String(fileName || "upload.html")
    : String(staticSiteDir || "").trim();

  if (!htmlContent && !sourceName) {
    throw new Error("staticSiteDir or htmlContent is required");
  }

  const report = {
    sourceName,
    createdAt: new Date().toISOString(),
    options: options || {},
    summary: {
      totalFiles: 0,
      pagesCreated: 0,
      pagesSkipped: 0,
      assetsDownloaded: 0,
      assetsCopied: 0,
      assetsSkipped: 0,
      assetsFailed: 0,
      warnings: 0,
      errors: 0,
    },
    items: [],
    assets: [],
    issues: [],
  };

  const assetManifest = await loadAssetManifest(contentRoot);
  const pagesDir = resolve(contentRoot, "pages");
  await ensureDir(pagesDir);

  // Build list of { htmlFilePath, content } pairs — either from uploaded content
  // or by scanning the filesystem.
  let htmlFilePairs;
  if (htmlContent) {
    htmlFilePairs = [{ htmlFilePath: sourceName, content: htmlContent }];
  } else {
    const pathStat = await stat(sourceName).catch(() => null);
    const htmlFiles = pathStat?.isFile()
      ? [sourceName]
      : await findHtmlFiles(sourceName);
    htmlFilePairs = htmlFiles.map((p) => ({ htmlFilePath: p, content: null }));
  }
  report.summary.totalFiles = htmlFilePairs.length;

  for (const { htmlFilePath, content: pairContent } of htmlFilePairs) {
    let fileContent = pairContent;
    if (fileContent === null) {
      try {
        fileContent = await readFile(htmlFilePath, "utf8");
      } catch (error) {
        report.issues.push({
          severity: "warning",
          type: "html-import",
          message: `Could not read ${htmlFilePath}`,
          details: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }

    const result = await buildPageFromStaticHtml({
      htmlContent: fileContent,
      htmlFilePath,
      contentRoot,
      assetManifest,
      report,
    });

    if (!result) {
      report.summary.pagesSkipped += 1;
      continue;
    }

    const { slug, page } = result;
    const finalId = await nextAvailableId(pagesDir, slug);
    page.id = finalId;

    await writeFile(resolve(pagesDir, `${finalId}.json`), toJsonString(page));

    report.summary.pagesCreated += 1;
    report.items.push({
      title: page.title,
      url: page.url,
      destination: `pages/${finalId}.json`,
      status: "imported",
    });
  }

  await persistAssetManifest(assetManifest);

  report.summary.assetsDownloaded = report.assets.filter(
    (e) => e.status === "downloaded",
  ).length;
  report.summary.assetsCopied = report.assets.filter(
    (e) => e.status === "copied",
  ).length;
  report.summary.assetsSkipped = report.assets.filter(
    (e) => e.status === "skipped-existing",
  ).length;
  report.summary.assetsFailed = report.assets.filter(
    (e) => e.status === "failed",
  ).length;
  report.summary.warnings = report.issues.filter(
    (e) => e.severity === "warning",
  ).length;
  report.summary.errors = report.issues.filter(
    (e) => e.severity === "error",
  ).length;

  const reportPath = await writeReport(contentRoot, report);

  return {
    ok: true,
    summary: report.summary,
    reportPath,
    items: report.items,
  };
}
