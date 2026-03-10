function makeSnippet(text, index, radius = 140) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);

  return text
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url) {
  try {
    return new URL(url).href;
  } catch {
    return url || "";
  }
}

function isUsefulExternalUrl(url) {
  if (!url) return false;
  if (url.startsWith("chrome-extension://")) return false;
  if (url.startsWith("devtools://")) return false;
  if (url.startsWith("data:")) return false;
  if (url.startsWith("blob:")) return false;
  return true;
}

function buildJsPatterns() {
  return [
    {
      name: "document.write + unescape",
      severity: "CRITICAL",
      regex: /document\s*\.\s*write\s*\(\s*unescape\s*\(/gi
    },
    {
      name: "document.write + decodeURIComponent",
      severity: "CRITICAL",
      regex: /document\s*\.\s*write\s*\(\s*decodeURIComponent\s*\(/gi
    },
    {
      name: "document.write + atob",
      severity: "CRITICAL",
      regex: /document\s*\.\s*write\s*\(\s*atob\s*\(/gi
    },
    {
      name: "unescape(%3Cscript)",
      severity: "CRITICAL",
      regex: /\bunescape\s*\(\s*["'][^"']*%3C(?:script|%73%63%72%69%70%74)/gi
    },
    {
      name: "decodeURIComponent(%3Cscript)",
      severity: "CRITICAL",
      regex: /\bdecodeURIComponent\s*\(\s*["'][^"']*%3C(?:script|%73%63%72%69%70%74)/gi
    },
    {
      name: "atob(<script-ish payload>)",
      severity: "HIGH",
      regex: /\batob\s*\(/gi
    },
    {
      name: "<script src=...> string",
      severity: "HIGH",
      regex: /<script\b[^>]*src\s*=|%3Cscript[^"']*src=|%3C%73%63%72%69%70%74[^"']*%73%72%63%3D/gi
    }
  ];
}

function rankSeverity(severity) {
  const rank = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };
  return rank[severity] || 0;
}

function scanJsText(text, sourceLabel) {
  const findings = [];
  if (!text || !text.trim()) return findings;

  const patterns = buildJsPatterns();

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    let count = 0;

    while ((match = regex.exec(text)) !== null) {
      findings.push({
        severity: pattern.severity,
        type: pattern.name,
        source: sourceLabel,
        index: match.index,
        snippet: makeSnippet(text, match.index)
      });

      count += 1;
      if (count >= 5) break;

      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }

  return findings;
}

function groupFindings(findings) {
  const groups = [];

  for (const finding of findings) {
    // 같은 source 안에서 index가 아주 가까우면 같은 이벤트로 간주
    const existing = groups.find(group =>
      group.source === finding.source &&
      Math.abs(group.index - finding.index) < 80
    );

    if (existing) {
      if (!existing.matched.includes(finding.type)) {
        existing.matched.push(finding.type);
      }

      // 더 높은 severity가 있으면 올림
      if (rankSeverity(finding.severity) > rankSeverity(existing.severity)) {
        existing.severity = finding.severity;
      }

      // snippet은 더 긴 쪽 유지
      if ((finding.snippet || "").length > (existing.snippet || "").length) {
        existing.snippet = finding.snippet;
      }
    } else {
      groups.push({
        severity: finding.severity,
        source: finding.source,
        index: finding.index,
        matched: [finding.type],
        snippet: finding.snippet
      });
    }
  }

  return groups;
}

function analyzeScripts(scriptsWithContent) {
  let findings = [];

  for (const script of scriptsWithContent) {
    const sourceLabel = script.src
      ? normalizeUrl(script.src)
      : `inline#${script.index}`;

    findings = findings.concat(scanJsText(script.content || "", sourceLabel));
  }

  const grouped = groupFindings(findings);

  grouped.sort((a, b) => {
    const sev = rankSeverity(b.severity) - rankSeverity(a.severity);
    if (sev !== 0) return sev;
    return a.source.localeCompare(b.source);
  });

  return grouped;
}