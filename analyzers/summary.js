function buildSummary({ headerInfo, formInfo, cloudflareInfo, jsInfo }) {
  const items = [];

  if (cloudflareInfo.hasCloudflareBeacon || cloudflareInfo.hasCdnCgi) {
    items.push("Cloudflare 흔적 있음");
  }

  if (formInfo.formCount > 0) {
    items.push(`form ${formInfo.formCount}개 발견`);
  }

  const passwordForm = formInfo.forms.find(f => f.passwordCount > 0);
  if (passwordForm) {
    items.push("비밀번호 입력 필드 존재");
  }

  if (headerInfo.hasMetaRefresh) {
    items.push("meta refresh 존재");
  }

  if (headerInfo.hasPasswordKeyword) {
    items.push("credential 관련 키워드 존재");
  }

  if (jsInfo && jsInfo.suspiciousCount > 0) {
    items.push(`의심스러운 inline script ${jsInfo.suspiciousCount}개`);
  }

  const hasDecodedExternalScript =
    jsInfo &&
    jsInfo.suspiciousScripts.some(script =>
      script.findings.some(f => f.decodedHasScriptTag)
    );

  if (hasDecodedExternalScript) {
    items.push("unescape + document.write로 외부 script 삽입 흔적");
  }

  if (items.length === 0) {
    items.push("뚜렷한 징후 없음");
  }

  return items;
}