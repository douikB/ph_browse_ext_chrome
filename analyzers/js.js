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
    const hasDecodeURIComponent = /\bdecodeURIComponent\s*\(/i.test(content);
    const hasAtob = /\batob\s*\(/i.test(content);
    const hasScriptSrcString = /<script\b[^>]*src\s*=|script\s+src\s*=|src\s*=\s*https?:/i.test(content);

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

    const suspicious =
      hasDocumentWrite ||
      hasUnescape ||
      hasDecodeURIComponent ||
      hasAtob ||
      hasScriptSrcString ||
      findings.some(f => f.decodedHasScriptTag);

    scripts.push({
      index,
      length: content.length,
      preview: content.slice(0, 300),
      hasDocumentWrite,
      hasUnescape,
      hasDecodeURIComponent,
      hasAtob,
      hasScriptSrcString,
      suspicious,
      findings
    });

    index += 1;
  }

  const suspiciousScripts = scripts.filter(s => s.suspicious);

  return {
    totalInlineScripts: scripts.length,
    suspiciousCount: suspiciousScripts.length,
    scripts,
    suspiciousScripts
  };
}