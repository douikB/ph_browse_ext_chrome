function safeDecodeUnescapeString(encoded) {
  try {
    return unescape(encoded);
  } catch {
    return null;
  }
}

function analyzeInlineScripts(html) {
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  let match;
  let index = 0;

  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1] || "";

    const hasDocumentWrite = /document\s*\.\s*write\s*\(/i.test(content);
    const hasUnescape = /\bunescape\s*\(/i.test(content);

    const findings = [];

    const unescapeCallRegex = /unescape\s*\(\s*["']([^"']+)["']\s*\)/gi;
    let unescapeMatch;

    while ((unescapeMatch = unescapeCallRegex.exec(content)) !== null) {
      const encoded = unescapeMatch[1];
      const decoded = safeDecodeUnescapeString(encoded);

      const decodedHasScriptTag = decoded
        ? /<script\b[^>]*src\s*=/i.test(decoded)
        : false;

      const decodedScriptSrcMatch = decoded
        ? decoded.match(/<script\b[^>]*src\s*=\s*["']?([^"'>\s]+)["']?/i)
        : null;

      findings.push({
        type: "unescape",
        encodedPreview: encoded.slice(0, 120),
        decodedPreview: decoded ? decoded.slice(0, 200) : null,
        decodedHasScriptTag,
        decodedScriptSrc: decodedScriptSrcMatch ? decodedScriptSrcMatch[1] : null
      });
    }

    scripts.push({
      index,
      length: content.length,
      hasDocumentWrite,
      hasUnescape,
      suspicious: hasDocumentWrite && hasUnescape,
      findings
    });

    index += 1;
  }

  const suspiciousScripts = scripts.filter(
    s =>
      s.suspicious ||
      s.findings.some(f => f.decodedHasScriptTag)
  );

  return {
    totalInlineScripts: scripts.length,
    suspiciousCount: suspiciousScripts.length,
    scripts,
    suspiciousScripts
  };
}