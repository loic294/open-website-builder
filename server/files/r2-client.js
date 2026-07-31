import { createHash, createHmac } from "node:crypto";

function sign(key, msg) {
  return createHmac("sha256", key).update(msg).digest();
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = sign(`AWS4${secretKey}`, dateStamp);
  const kRegion = sign(kDate, region);
  const kService = sign(kRegion, service);
  return sign(kService, "aws4_request");
}

function toHex(buffer) {
  return Buffer.from(buffer).toString("hex");
}

function sha256hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

function formatDate(date) {
  return date.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
}

/**
 * Minimal AWS Signature V4 signer for Cloudflare R2 (S3-compatible endpoint).
 */
function buildAuthHeaders({ method, url, headers, body, credentials }) {
  const { accessKeyId, secretAccessKey, accountId, bucketName } = credentials;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = formatDate(now);
  const dateStamp = amzDate.slice(0, 8);

  const parsedUrl = new URL(url);
  const canonicalUri = parsedUrl.pathname;
  const canonicalQueryString = [...parsedUrl.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const bodyHash = sha256hex(body || "");

  const allHeaders = {
    host: parsedUrl.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": bodyHash,
    ...headers,
  };

  const signedHeaderNames = Object.keys(allHeaders).sort();
  const canonicalHeaders = signedHeaderNames
    .map((k) => `${k}:${allHeaders[k].trim()}`)
    .join("\n");
  const signedHeaders = signedHeaderNames.join(";");

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders + "\n",
    signedHeaders,
    bodyHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = toHex(sign(signingKey, stringToSign));

  return {
    ...allHeaders,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export function createR2Client({ accountId, bucketName, accessKeyId, secretAccessKey }) {
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}`;
  const credentials = { accessKeyId, secretAccessKey, accountId, bucketName };

  async function r2Fetch(method, path, { body, contentType, queryParams } = {}) {
    const url = new URL(`${endpoint}/${path}`);
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        url.searchParams.set(k, v);
      }
    }

    const extraHeaders = {};
    if (contentType) extraHeaders["content-type"] = contentType;

    const headers = buildAuthHeaders({
      method,
      url: url.toString(),
      headers: extraHeaders,
      body,
      credentials,
    });

    return fetch(url.toString(), {
      method,
      headers,
      body: body || undefined,
    });
  }

  return {
    /** List objects with a virtual-directory delimiter (one level deep). */
    async listObjects(prefix = "") {
      const response = await r2Fetch("GET", "", {
        queryParams: { "list-type": "2", prefix, delimiter: "/" },
      });
      if (!response.ok) {
        throw new Error(`R2 listObjects failed: ${response.status} ${await response.text()}`);
      }
      const xml = await response.text();
      return parseListBucketResult(xml);
    },

    /** List ALL objects under a prefix recursively, paginating through the full result set. */
    async listAllObjects(prefix = "") {
      const allContents = [];
      let continuationToken = null;

      do {
        const queryParams = { "list-type": "2", prefix };
        if (continuationToken) queryParams["continuation-token"] = continuationToken;

        const response = await r2Fetch("GET", "", { queryParams });
        if (!response.ok) {
          throw new Error(`R2 listAllObjects failed: ${response.status} ${await response.text()}`);
        }
        const xml = await response.text();
        const page = parseListBucketResult(xml);
        allContents.push(...page.contents);
        continuationToken = parseNextContinuationToken(xml);
      } while (continuationToken);

      return { contents: allContents };
    },

    /** Stream a single object. Returns the fetch Response. */
    async getObject(key) {
      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      return r2Fetch("GET", encodedKey);
    },

    /** Upload an object. body must be a Buffer or string. */
    async putObject(key, body, contentType = "application/octet-stream") {
      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      const response = await r2Fetch("PUT", encodedKey, { body, contentType });
      if (!response.ok) {
        throw new Error(`R2 putObject failed: ${response.status} ${await response.text()}`);
      }
    },

    /** Delete a single object. */
    async deleteObject(key) {
      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      const response = await r2Fetch("DELETE", encodedKey);
      if (!response.ok && response.status !== 404) {
        throw new Error(`R2 deleteObject failed: ${response.status} ${await response.text()}`);
      }
    },

    /** Delete multiple objects (up to 1000 at a time). */
    async deleteObjects(keys) {
      if (!keys.length) return;
      const objectsXml = keys
        .map((k) => `<Object><Key>${escapeXml(k)}</Key></Object>`)
        .join("");
      const body = `<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>true</Quiet>${objectsXml}</Delete>`;
      const md5 = createHash("md5").update(body).digest("base64");
      const response = await r2Fetch("POST", "", {
        queryParams: { delete: "" },
        body,
        contentType: "application/xml",
        extraHeaders: { "content-md5": md5 },
      });
      if (!response.ok) {
        throw new Error(`R2 deleteObjects failed: ${response.status} ${await response.text()}`);
      }
    },
  };
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Parse S3 ListBucketResult XML into a plain object. */
function parseListBucketResult(xml) {
  const contents = [];
  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;
  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1];
    const key = extractTag(block, "Key");
    const size = parseInt(extractTag(block, "Size") || "0", 10);
    const lastModified = extractTag(block, "LastModified");
    contents.push({ key, size, lastModified });
  }

  const prefixes = [];
  const prefixRegex = /<CommonPrefixes>[\s\S]*?<Prefix>([\s\S]*?)<\/Prefix>[\s\S]*?<\/CommonPrefixes>/g;
  while ((match = prefixRegex.exec(xml)) !== null) {
    prefixes.push(match[1]);
  }

  return { contents, prefixes };
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
  return m ? m[1] : "";
}

function parseNextContinuationToken(xml) {
  const m = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/);
  return m ? m[1] : null;
}
