export type FieldType = 'text' | 'textarea' | 'image' | 'bullets' | 'metrics' | 'cta' | 'gallery';

export interface GalleryItem {
  en: string;
  ar: string;
  dataUrl?: string;
}

export interface FieldDef {
  key: string;
  labelEn: string;
  labelAr: string;
  type: FieldType;
  required?: boolean;
  /** Dummy content pre-filled into a new draft so authors edit rather than start from a blank field. */
  exampleEn?: string;
  exampleAr?: string;
  exampleUrl?: string;
  exampleItems?: Array<{ en: string; ar: string; num?: string; chg?: string }>;
}

export type LayoutKey =
  | 'message'
  | 'spotlight'
  | 'celebration'
  | 'memoriam'
  | 'condolence'
  | 'stats'
  | 'event'
  | 'bulletins'
  | 'gallery';

export type FieldValues = Record<string, any>;

export interface TemplateSchema {
  fields: FieldDef[];
  subjectExampleEn?: string;
  subjectExampleAr?: string;
}

/** Accepts either a bare FieldDef[] (legacy) or { fields, subjectExampleEn, subjectExampleAr }. */
export function parseFieldSchema(json?: string): TemplateSchema {
  if (!json) return { fields: [] };
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return { fields: parsed };
    if (parsed && Array.isArray(parsed.fields)) {
      return { fields: parsed.fields, subjectExampleEn: parsed.subjectExampleEn, subjectExampleAr: parsed.subjectExampleAr };
    }
    return { fields: [] };
  } catch {
    return { fields: [] };
  }
}

export function initialValueFor(field: FieldDef): any {
  switch (field.type) {
    case 'bullets':
      return field.exampleItems?.length ? field.exampleItems.map((i) => ({ ...i })) : [{ en: '', ar: '' }];
    case 'metrics':
      return field.exampleItems?.length
        ? field.exampleItems.map((i) => ({ en: i.en, ar: i.ar, num: i.num ?? '', chg: i.chg ?? '' }))
        : [{ en: '', ar: '', num: '', chg: '' }];
    case 'cta':
      return { en: field.exampleEn ?? '', ar: field.exampleAr ?? '', url: field.exampleUrl ?? '' };
    case 'image':
      return null;
    case 'gallery':
      return field.exampleItems?.length ? field.exampleItems.map((i) => ({ en: i.en, ar: i.ar })) : [{ en: '', ar: '' }, { en: '', ar: '' }, { en: '', ar: '' }];
    default:
      return { en: field.exampleEn ?? '', ar: field.exampleAr ?? '' };
  }
}

export function buildInitialValues(fields: FieldDef[]): FieldValues {
  const values: FieldValues = {};
  for (const f of fields) values[f.key] = initialValueFor(f);
  return values;
}

const GOLD = '#ffc000';
const BLACK = '#000000';
const CHARCOAL = '#202020';
const DARK_IRON = '#181818';
const WHITE = '#ffffff';
const ASH = '#b0b0b0';

function esc(text: string): string {
  return (text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nl2br(text: string): string {
  return esc(text).replace(/\n/g, '<br/>');
}

function field(values: FieldValues, key: string) {
  return values[key] ?? { en: '', ar: '' };
}

function title(text: string, rtl: boolean, size = 26, center = false): string {
  if (!text) return '';
  return `<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.01em;font-size:${size}px;line-height:1.1;color:${WHITE};margin:0 0 12px;text-align:${center ? 'center' : rtl ? 'right' : 'left'};">${esc(text)}</h1>`;
}

function para(text: string, rtl: boolean, center = false): string {
  if (!text) return '';
  return `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:${ASH};margin:0 0 16px;text-align:${center ? 'center' : rtl ? 'right' : 'left'};">${nl2br(text)}</p>`;
}

function eyebrow(text: string, rtl: boolean): string {
  if (!text) return '';
  return `<div style="color:${GOLD};font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;text-align:${rtl ? 'right' : 'left'};font-family:Arial,sans-serif;">${esc(text)}</div>`;
}

function cta(values: FieldValues, lang: 'en' | 'ar', rtl: boolean): string {
  const c = values.cta;
  if (!c || !c[lang]) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr><td style="background:${GOLD};border-radius:0;">` +
    `<a href="${esc(c.url || '#')}" style="display:block;color:${BLACK};text-decoration:none;padding:14px 28px;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;font-family:'Barlow Condensed',Arial,sans-serif;white-space:nowrap;">${esc(c[lang])}&nbsp;${rtl ? '&larr;' : '&rarr;'}</a>` +
    `</td></tr></table>`;
}

function bulletList(items: Array<{ en: string; ar: string }>, lang: 'en' | 'ar', rtl: boolean): string {
  if (!items?.length) return '';
  const rows = items
    .filter((b) => b[lang])
    .map(
      (b) =>
        `<div style="display:flex;gap:12px;align-items:flex-start;flex-direction:${rtl ? 'row-reverse' : 'row'};margin-bottom:16px;">` +
        `<span style="flex-shrink:0;width:18px;height:18px;background:${GOLD};color:${BLACK};display:inline-block;text-align:center;line-height:18px;font-size:12px;font-weight:700;">&#10003;</span>` +
        `<span style="font-size:14.5px;color:${WHITE};line-height:1.6;">${esc(b[lang])}</span>` +
        `</div>`
    )
    .join('');
  return `<div style="margin-bottom:16px;">${rows}</div>`;
}

function metricsGrid(items: Array<{ en: string; ar: string; num: string; chg: string }>, lang: 'en' | 'ar', rtl: boolean): string {
  if (!items?.length) return '';
  const cols = items.length >= 4 ? 2 : Math.min(items.length, 3);
  const cellArr = items.map((_, i) => i);
  const chunked: number[][] = [];
  for (let i = 0; i < cellArr.length; i += cols) chunked.push(cellArr.slice(i, i + cols));
  const cellsHtml = items.map((m) => {
    const up = (m.chg || '').trim().startsWith('+');
    return (
      `<td style="border:1px solid #333;padding:14px 16px;direction:${rtl ? 'rtl' : 'ltr'};vertical-align:top;width:${100 / cols}%;">` +
      `<div style="font-size:11px;color:${ASH};font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">${esc(m[lang])}</div>` +
      `<div style="font-size:22px;font-weight:700;color:${GOLD};font-family:'Barlow Condensed',Arial,sans-serif;line-height:1;">${esc(m.num)}</div>` +
      (m.chg ? `<div style="font-size:12px;font-weight:700;color:${up ? '#4ade80' : '#f87171'};margin-top:4px;">${up ? '▲' : '▼'} ${esc(m.chg)}</div>` : '') +
      `</td>`
    );
  });
  const trs = chunked.map((row) => `<tr>${row.map((i) => cellsHtml[i]).join('')}</tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${trs}</table>`;
}

function galleryGrid(items: Array<{ en: string; ar: string; dataUrl?: string }>, lang: 'en' | 'ar', rtl: boolean): string {
  const shown = items.filter((i) => i[lang] || i.dataUrl);
  if (!shown.length) return '';
  const cols = shown.length >= 3 ? 3 : shown.length;
  const cellsHtml = shown.map((it) => {
    const photo = it.dataUrl
      ? `<img src="${it.dataUrl}" alt="" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;border:2px solid ${GOLD};" />`
      : `<div style="width:100%;aspect-ratio:1/1;background:${CHARCOAL};border:1px solid #333;"></div>`;
    return (
      `<td style="width:${100 / cols}%;padding:8px;vertical-align:top;text-align:center;">` +
      photo +
      `<div style="margin-top:8px;font-size:13px;font-weight:700;color:${WHITE};font-family:'Barlow Condensed',Arial,sans-serif;text-transform:uppercase;">${esc(it[lang])}</div>` +
      `</td>`
    );
  });
  const chunked: string[][] = [];
  for (let i = 0; i < cellsHtml.length; i += cols) chunked.push(cellsHtml.slice(i, i + cols));
  const trs = chunked.map((row) => `<tr>${row.join('')}</tr>`).join('');
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;direction:${rtl ? 'rtl' : 'ltr'};">${trs}</table>`;
}

function bulletSections(fields: FieldDef[], values: FieldValues, lang: 'en' | 'ar', rtl: boolean, withHeads: boolean): string {
  return fields
    .filter((f) => f.type === 'bullets')
    .map((f) => {
      const head = withHeads
        ? `<div style="font-weight:700;font-size:12px;color:${WHITE};text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 8px;">${esc(rtl ? f.labelAr : f.labelEn)}</div>`
        : '';
      return head + bulletList(values[f.key], lang, rtl);
    })
    .join('');
}

function langBlock(inner: string, lang: 'en' | 'ar', rtl: boolean): string {
  return `<div dir="${rtl ? 'rtl' : 'ltr'}" lang="${lang}" style="padding:32px 30px;font-family:${rtl ? "'Cairo',Arial,sans-serif" : "Arial,sans-serif"};text-align:${rtl ? 'right' : 'left'};">${inner}</div>`;
}

function renderBody(layout: LayoutKey, fields: FieldDef[], values: FieldValues, lang: 'en' | 'ar'): string {
  const rtl = lang === 'ar';
  const g = (key: string) => field(values, key)[lang] ?? '';

  if (layout === 'message') {
    const hero = values.__imageSrc
      ? `<img src="${values.__imageSrc}" alt="" style="width:100%;display:block;aspect-ratio:640/300;object-fit:cover;margin-bottom:18px;" />`
      : '';
    return langBlock(
      hero + eyebrow(g('eyebrow'), rtl) + title(g('title'), rtl) + para(g('body'), rtl) + bulletSections(fields, values, lang, rtl, false) + cta(values, lang, rtl),
      lang,
      rtl
    );
  }

  if (layout === 'spotlight') {
    const photo = values.__imageSrc
      ? `<img src="${values.__imageSrc}" alt="" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid ${GOLD};" />`
      : '';
    const badge = g('badge')
      ? `<div style="display:inline-block;background:${GOLD};color:${BLACK};padding:6px 14px;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-top:10px;">${esc(g('badge'))}</div>`
      : '';
    return langBlock(
      `<div style="display:flex;gap:16px;align-items:center;flex-direction:${rtl ? 'row-reverse' : 'row'};margin-bottom:18px;">` +
        photo +
        `<div>${eyebrow(g('eyebrow'), rtl)}<div style="font-family:'Barlow Condensed',Arial,sans-serif;font-weight:600;text-transform:uppercase;font-size:20px;color:${WHITE};">${esc(g('name'))}</div><div style="font-size:13.5px;color:${ASH};margin-top:2px;">${esc(g('subtitle'))}</div></div>` +
        `</div>` +
        (g('message') ? `<div style="border:1px solid #333;padding:16px 18px;margin-bottom:14px;">${para(`“${g('message')}”`, rtl)}</div>` : '') +
        badge,
      lang,
      rtl
    );
  }

  if (layout === 'celebration') {
    const photo = values.__imageSrc
      ? `<img src="${values.__imageSrc}" alt="" style="width:92px;height:92px;border-radius:50%;object-fit:cover;border:3px solid ${GOLD};margin:8px 0 14px;" />`
      : '';
    return langBlock(
      `<div style="text-align:center;">` +
        eyebrow(g('eyebrow'), rtl) +
        (values.__imageSrc ? `<div style="text-align:center;">${photo}</div>` : '') +
        (g('name') ? `<div style="font-family:'Barlow Condensed',Arial,sans-serif;font-weight:600;text-transform:uppercase;font-size:20px;color:${WHITE};margin-bottom:4px;">${esc(g('name'))}</div>` : '') +
        title(g('title'), rtl, 22, true) +
        para(g('body'), rtl, true) +
        `</div>`,
      lang,
      rtl
    );
  }

  if (layout === 'memoriam') {
    const photo = values.__imageSrc
      ? `<img src="${values.__imageSrc}" alt="" style="width:100px;height:100px;border-radius:50%;object-fit:cover;filter:grayscale(1);border:2px solid #333;margin:8px 0 16px;" />`
      : '';
    return langBlock(
      `<div style="text-align:center;">` +
        eyebrow(g('eyebrow'), rtl) +
        (values.__imageSrc ? `<div style="text-align:center;">${photo}</div>` : '') +
        `<div style="font-family:'Barlow Condensed',Arial,sans-serif;font-weight:600;text-transform:uppercase;font-size:22px;color:${WHITE};">${esc(g('name'))}</div>` +
        `<div style="font-size:13px;color:${ASH};margin-top:4px;">${esc(g('subtitle'))}</div>` +
        `<div style="width:48px;height:2px;background:${GOLD};margin:18px auto;"></div>` +
        para(g('body'), rtl, true) +
        `</div>`,
      lang,
      rtl
    );
  }

  if (layout === 'condolence') {
    return langBlock(
      `<div style="text-align:center;">` +
        eyebrow(g('eyebrow'), rtl) +
        (g('name')
          ? `<div style="font-size:16px;font-weight:700;color:${WHITE};margin-bottom:12px;">${rtl ? `إلى ${esc(g('name'))} وعائلته` : `To ${esc(g('name'))} &amp; family`}</div>`
          : '') +
        para(g('body'), rtl, true) +
        `<div style="font-size:12.5px;color:${ASH};margin-top:8px;">${rtl ? '' : ''}</div>` +
        `</div>`,
      lang,
      rtl
    );
  }

  if (layout === 'stats') {
    const metricsField = fields.find((f) => f.type === 'metrics');
    return langBlock(
      title(g('title'), rtl) +
        para(g('intro'), rtl) +
        (metricsField ? metricsGrid(values[metricsField.key], lang, rtl) : '') +
        bulletSections(fields, values, lang, rtl, true) +
        cta(values, lang, rtl),
      lang,
      rtl
    );
  }

  if (layout === 'event') {
    const rows: Array<[string, string, string]> = [
      ['date', 'Date', 'التاريخ'],
      ['time', 'Time', 'الوقت'],
      ['location', 'Location', 'المكان'],
      ['host', 'Host', 'المضيف'],
    ].filter(([k]) => g(k)) as any;
    const rowsHtml = rows
      .map(
        ([k, le, la]: [string, string, string]) =>
          `<div style="display:flex;gap:10px;align-items:baseline;flex-direction:${rtl ? 'row-reverse' : 'row'};margin-bottom:7px;">` +
          `<span style="font-size:10.5px;color:${GOLD};font-weight:700;min-width:64px;text-transform:uppercase;letter-spacing:0.05em;">${rtl ? la : le}</span>` +
          `<span style="font-size:14.5px;color:${WHITE};font-weight:600;">${esc(g(k))}</span>` +
          `</div>`
      )
      .join('');
    return langBlock(
      title(g('title'), rtl) +
        (rows.length ? `<div style="border:1px solid #333;padding:16px 18px;margin-bottom:16px;">${rowsHtml}</div>` : '') +
        para(g('body'), rtl) +
        bulletSections(fields, values, lang, rtl, false) +
        cta(values, lang, rtl),
      lang,
      rtl
    );
  }

  if (layout === 'bulletins') {
    return langBlock(
      (g('subtitle')
        ? `<div style="display:inline-block;background:${GOLD};color:${BLACK};font-size:11px;font-weight:700;padding:5px 12px;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">${esc(g('subtitle'))}</div>`
        : '') +
        title(g('title'), rtl) +
        bulletSections(fields, values, lang, rtl, true) +
        cta(values, lang, rtl),
      lang,
      rtl
    );
  }

  if (layout === 'gallery') {
    const galleryField = fields.find((f) => f.type === 'gallery');
    return langBlock(
      eyebrow(g('eyebrow'), rtl) +
        title(g('title'), rtl) +
        para(g('intro'), rtl) +
        (galleryField ? galleryGrid(values[galleryField.key] ?? [], lang, rtl) : '') +
        cta(values, lang, rtl),
      lang,
      rtl
    );
  }

  return langBlock(para('Unknown layout.', rtl), lang, rtl);
}

export interface RenderEmailArgs {
  layout: LayoutKey;
  fields: FieldDef[];
  values: FieldValues;
  subjectEn: string;
  subjectAr: string;
  templateName: string;
  imageSrc?: string;
}

export function renderEmailHtml({ layout, fields, values, subjectEn, subjectAr, templateName, imageSrc }: RenderEmailArgs): string {
  const v = { ...values, __imageSrc: imageSrc };
  const en = renderBody(layout, fields, v, 'en');
  const ar = renderBody(layout, fields, v, 'ar');

  return `<div style="background:${BLACK};max-width:640px;margin:0 auto;">
  <div style="background:${DARK_IRON};padding:20px 30px;display:flex;align-items:center;justify-content:space-between;">
    <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${WHITE};font-size:15px;">APEX</span>
    <span style="background:rgba(255,192,0,0.12);color:${GOLD};font-size:10.5px;font-weight:700;padding:5px 10px;text-transform:uppercase;letter-spacing:0.05em;">${esc(templateName)}</span>
  </div>
  ${subjectEn || subjectAr ? '' : ''}
  ${en}
  <div style="height:1px;background:${CHARCOAL};margin:0 30px;"></div>
  ${ar}
  <div style="background:${CHARCOAL};padding:18px 30px;color:${ASH};font-size:11px;line-height:1.6;">
    Internal communication — please do not forward externally &middot; رسالة داخلية لا تُرسل خارجياً
  </div>
</div>`;
}
