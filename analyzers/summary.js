function buildSummary({ headerInfo, formInfo, cloudflareInfo }) {
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

  if (items.length === 0) {
    items.push("뚜렷한 징후 없음");
  }

  return items;
}