import type { MetadataRoute } from "next";

/**
 * The protected preview must never be indexed. This is belt-and-braces alongside the
 * X-Robots-Tag header set by the preview gate middleware: a crawler cannot reach application
 * content without the passphrase anyway, but a disallow-all robots policy means a crawler does
 * not retain the URL either.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
