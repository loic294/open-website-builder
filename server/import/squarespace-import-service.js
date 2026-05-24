import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
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
    seo: {
      title: toText(item?.title).trim(),
      description: excerpt,
    },
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
  };
}

function makeImageNode(url) {
  return {
    id: `image-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "image",
    url,
  };
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
      report.assets.push({
        sourceUrl: trimmed,
        localPath: known.localPath,
        status: "skipped-existing",
        reason: "manifest-hit",
      });
      return known.localPath;
    }
  }

  const imagesDir = resolve(contentRoot, IMPORTED_IMAGES_DIR);
  await ensureDir(imagesDir);

  const fileName = normalizeFileNameFromUrl(trimmed);
  const absoluteTargetPath = resolve(imagesDir, fileName);
  const relativeTargetPath = `/images/imported/${fileName}`;

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
        sectionNodes.push(makeGalleryNode(galleryUrls));
      }
    }

    const embedEls = contextRoot
      .find(".sqs-block-embed, iframe, .sqs-block-code")
      .toArray();
    for (const embedEl of embedEls) {
      const embedHtml = $.html(embedEl);
      if (embedHtml && embedHtml.trim()) {
        sectionNodes.push(makeEmbedNode(embedHtml));
      }
    }

    const buttonEls = contextRoot
      .find(".sqs-block-button a, a.sqs-block-button-element")
      .toArray();
    for (const buttonEl of buttonEls) {
      const href = $(buttonEl).attr("href") || "";
      const label = $(buttonEl).text().trim();
      sectionNodes.push(makeButtonNode(label, href));
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
        sectionNodes.push({
          id: `social-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: "social-media",
          items,
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
        sectionNodes.push(makeImageNode(localUrl));
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
      resultSections.push(ensureSection(sectionNodes));
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
      excerpt: { type: "string", required: false },
      tags: { type: "array", required: false },
    },
  };

  await writeFile(configPath, toJsonString(config));
}

function buildCollectionId(metadata) {
  const category = asArray(metadata?.categories || [])
    .map((value) => sanitizeId(value))
    .find(Boolean);
  const postType = sanitizeId(metadata?.postType);
  return category || postType || "posts";
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
    const sourceUrl = metadata.sourceUrl || "/";

    const parsedUrlPath = (() => {
      try {
        const url = new URL(sourceUrl);
        return url.pathname || "/";
      } catch {
        return String(sourceUrl || "/");
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

    const globalCssPath = await writeGlobalStylesFile({
      contentRoot,
      baseName: metadata.slug || title,
      cssBlocks: mapped.globalStyles,
    });

    if (globalCssPath) {
      metadata.globalCssFiles = [globalCssPath];
      report.summary.globalCssFilesCreated += 1;
    }

    if (postType === "page") {
      const slugBase =
        sanitizeId(metadata.slug || parsedUrlPath || title) || "page";
      const pageId = await nextAvailableId(pagesDir, slugBase);

      const pagePayload = {
        type: "page",
        id: pageId,
        title,
        url: parsedUrlPath || `/${pageId}`,
        metadata,
        content,
      };

      await writeFile(
        resolve(pagesDir, `${pageId}.json`),
        toJsonString(pagePayload),
      );
      report.summary.pagesCreated += 1;
      report.items.push({
        title,
        postType,
        destination: `pages/${pageId}.json`,
        status: "imported",
      });
      continue;
    }

    const collectionId = buildCollectionId(metadata);
    await ensureCollectionConfig(contentRoot, collectionId);
    const collectionDir = resolve(contentRoot, "collections", collectionId);
    const itemBase =
      sanitizeId(metadata.slug || title || `item-${Date.now()}`) || "item";
    const itemId = await nextAvailableId(collectionDir, itemBase);

    const itemPayload = {
      id: itemId,
      title,
      excerpt: metadata.excerpt || "",
      tags: metadata.tags || [],
      metadata,
      content,
    };

    await writeFile(
      resolve(collectionDir, `${itemId}.json`),
      toJsonString(itemPayload),
    );
    report.summary.collectionItemsCreated += 1;
    report.items.push({
      title,
      postType,
      destination: `collections/${collectionId}/${itemId}.json`,
      status: "imported",
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
