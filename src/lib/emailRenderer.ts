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

// Table-based "bulletproof button" — display:inline-block on <a> collapses in Outlook's
// Word rendering engine, so we use the standard email-safe table pattern instead.
function cta(values: FieldValues, lang: 'en' | 'ar', rtl: boolean): string {
  const c = values.cta;
  if (!c || !c[lang]) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr><td style="background-color:${GOLD};">` +
    `<a href="${esc(c.url || '#')}" style="display:inline-block;color:${BLACK};text-decoration:none;padding:16px 40px;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.08em;font-family:'Barlow Condensed',Arial,sans-serif;white-space:nowrap;">${esc(c[lang])}&nbsp;&nbsp;${rtl ? '&larr;' : '&rarr;'}</a>` +
    `</td></tr></table>`;
}

// Table-based checklist — flexbox (gap/align-items) is silently ignored by Outlook desktop,
// collapsing the checkbox and text together with no gap.
function bulletList(items: Array<{ en: string; ar: string }>, lang: 'en' | 'ar', rtl: boolean): string {
  if (!items?.length) return '';
  const rows = items
    .filter((b) => b[lang])
    .map((b) => {
      const checkCell = `<td width="18" valign="top" style="width:18px;padding:0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="18" height="18" style="width:18px;height:18px;background-color:${GOLD};color:${BLACK};text-align:center;font-size:12px;font-weight:700;line-height:18px;">&#10003;</td></tr></table></td>`;
      const textCell = `<td valign="top" style="padding-${rtl ? 'right' : 'left'}:12px;font-size:14.5px;color:${WHITE};line-height:1.6;">${esc(b[lang])}</td>`;
      return `<tr>${rtl ? textCell + checkCell : checkCell + textCell}</tr><tr><td colspan="2" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>`;
    })
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:6px;">${rows}</table>`;
}

function metricsGrid(items: Array<{ en: string; ar: string; num: string; chg: string }>, lang: 'en' | 'ar', rtl: boolean): string {
  if (!items?.length) return '';
  const cols = items.length >= 4 ? 2 : Math.min(items.length, 3);
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
  const chunked: string[][] = [];
  for (let i = 0; i < cellsHtml.length; i += cols) chunked.push(cellsHtml.slice(i, i + cols));
  const trs = chunked.map((row) => `<tr>${row.join('')}</tr>`).join('');
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;">${trs}</table>`;
}

/** Gallery photos + bilingual captions, rendered ONCE (not per-language) so a 3-photo gallery
 *  doesn't double its base64 payload across the EN and AR blocks. */
function galleryGridShared(items: GalleryItem[]): string {
  const shown = items.filter((i) => i.en || i.ar || i.dataUrl);
  if (!shown.length) return '';
  const cols = shown.length >= 3 ? 3 : shown.length;
  const cellsHtml = shown.map((it) => {
    const photo = it.dataUrl
      ? `<img src="${it.dataUrl}" alt="" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;border:2px solid ${GOLD};" />`
      : `<div style="width:100%;aspect-ratio:1/1;background-color:${CHARCOAL};border:1px solid #333;"></div>`;
    const captions =
      (it.en ? `<div style="margin-top:8px;font-size:13px;font-weight:700;color:${WHITE};font-family:'Barlow Condensed',Arial,sans-serif;text-transform:uppercase;text-align:center;">${esc(it.en)}</div>` : '') +
      (it.ar ? `<div dir="rtl" lang="ar" style="margin-top:2px;font-size:13px;color:${ASH};font-family:'Cairo',Arial,sans-serif;text-align:center;">${esc(it.ar)}</div>` : '');
    return `<td style="width:${100 / cols}%;padding:8px;vertical-align:top;text-align:center;">${photo}${captions}</td>`;
  });
  const chunked: string[][] = [];
  for (let i = 0; i < cellsHtml.length; i += cols) chunked.push(cellsHtml.slice(i, i + cols));
  const trs = chunked.map((row) => `<tr>${row.join('')}</tr>`).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;padding:0 30px 8px;">${trs}</table>`;
}

/** A single shared photo, rendered ONCE above both language blocks (not duplicated per-language). */
function heroPhotoShared(imageSrc: string | undefined, style: 'photo' | 'circle-grayscale'): string {
  if (!imageSrc) return '';
  if (style === 'circle-grayscale') {
    return `<div style="text-align:center;padding:24px 30px 0;"><img src="${imageSrc}" alt="" style="width:120px;height:120px;border-radius:50%;object-fit:cover;filter:grayscale(1);border:2px solid #333;" /></div>`;
  }
  // A real photo of the person/event — large and rectangular, not a tiny profile-style circle.
  return `<div style="padding:0;"><img src="${imageSrc}" alt="" style="width:100%;display:block;max-height:360px;object-fit:cover;border-bottom:3px solid ${GOLD};" /></div>`;
}

function bulletSections(fields: FieldDef[], values: FieldValues, lang: 'en' | 'ar', rtl: boolean, withHeads: boolean): string {
  return fields
    .filter((f) => f.type === 'bullets')
    .map((f) => {
      const head = withHeads
        ? `<div style="font-weight:700;font-size:12px;color:${WHITE};text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 10px;">${esc(rtl ? f.labelAr : f.labelEn)}</div>`
        : '';
      return head + bulletList(values[f.key], lang, rtl);
    })
    .join('');
}

function langBlock(inner: string, lang: 'en' | 'ar', rtl: boolean): string {
  return `<div dir="${rtl ? 'rtl' : 'ltr'}" lang="${lang}" style="padding:32px 30px;font-family:${rtl ? "'Cairo',Arial,sans-serif" : "Arial,sans-serif"};text-align:${rtl ? 'right' : 'left'};">${inner}</div>`;
}

/** Per-language text content only — shared visuals (photo/gallery) are rendered once by renderEmailHtml, not here. */
function renderBody(layout: LayoutKey, fields: FieldDef[], values: FieldValues, lang: 'en' | 'ar'): string {
  const rtl = lang === 'ar';
  const g = (key: string) => field(values, key)[lang] ?? '';

  if (layout === 'message') {
    return langBlock(
      eyebrow(g('eyebrow'), rtl) + title(g('title'), rtl) + para(g('body'), rtl) + bulletSections(fields, values, lang, rtl, false) + cta(values, lang, rtl),
      lang,
      rtl
    );
  }

  if (layout === 'spotlight') {
    const badge = g('badge')
      ? `<div style="display:inline-block;background-color:${GOLD};color:${BLACK};padding:6px 14px;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-top:10px;">${esc(g('badge'))}</div>`
      : '';
    return langBlock(
      eyebrow(g('eyebrow'), rtl) +
        `<div style="font-family:'Barlow Condensed',Arial,sans-serif;font-weight:600;text-transform:uppercase;font-size:22px;color:${WHITE};margin-top:14px;">${esc(g('name'))}</div>` +
        `<div style="font-size:13.5px;color:${ASH};margin-top:2px;margin-bottom:14px;">${esc(g('subtitle'))}</div>` +
        (g('message') ? `<div style="border:1px solid #333;padding:16px 18px;margin-bottom:14px;">${para(`“${g('message')}”`, rtl)}</div>` : '') +
        badge,
      lang,
      rtl
    );
  }

  if (layout === 'celebration') {
    return langBlock(
      `<div style="text-align:center;">` +
        eyebrow(g('eyebrow'), rtl) +
        (g('name') ? `<div style="font-family:'Barlow Condensed',Arial,sans-serif;font-weight:600;text-transform:uppercase;font-size:20px;color:${WHITE};margin-bottom:4px;">${esc(g('name'))}</div>` : '') +
        title(g('title'), rtl, 22, true) +
        para(g('body'), rtl, true) +
        `</div>`,
      lang,
      rtl
    );
  }

  if (layout === 'memoriam') {
    return langBlock(
      `<div style="text-align:center;">` +
        eyebrow(g('eyebrow'), rtl) +
        `<div style="font-family:'Barlow Condensed',Arial,sans-serif;font-weight:600;text-transform:uppercase;font-size:22px;color:${WHITE};">${esc(g('name'))}</div>` +
        `<div style="font-size:13px;color:${ASH};margin-top:4px;">${esc(g('subtitle'))}</div>` +
        `<div style="width:48px;height:2px;background-color:${GOLD};margin:18px auto;"></div>` +
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
    const rows: Array<[string, string, string]> = ([
      ['date', 'Date', 'التاريخ'],
      ['time', 'Time', 'الوقت'],
      ['location', 'Location', 'المكان'],
      ['host', 'Host', 'المضيف'],
    ] as Array<[string, string, string]>).filter(([k]) => g(k));
    const rowsHtml = rows
      .map(([k, le, la]) => {
        const labelCell = `<td width="90" valign="top" style="width:90px;font-size:10.5px;color:${GOLD};font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:0 0 8px;">${rtl ? la : le}</td>`;
        const valueCell = `<td valign="top" style="font-size:14.5px;color:${WHITE};font-weight:600;padding:0 0 8px;">${esc(g(k))}</td>`;
        return `<tr>${rtl ? valueCell + labelCell : labelCell + valueCell}</tr>`;
      })
      .join('');
    return langBlock(
      title(g('title'), rtl) +
        (rows.length ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #333;padding:16px 18px;margin-bottom:16px;">${rowsHtml}</table>` : '') +
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
        ? `<div style="display:inline-block;background-color:${GOLD};color:${BLACK};font-size:11px;font-weight:700;padding:5px 12px;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">${esc(g('subtitle'))}</div>`
        : '') +
        title(g('title'), rtl) +
        bulletSections(fields, values, lang, rtl, true) +
        cta(values, lang, rtl),
      lang,
      rtl
    );
  }

  if (layout === 'gallery') {
    return langBlock(
      eyebrow(g('eyebrow'), rtl) + title(g('title'), rtl) + para(g('intro'), rtl) + cta(values, lang, rtl),
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
  const en = renderBody(layout, fields, values, 'en');
  const ar = renderBody(layout, fields, values, 'ar');

  let sharedVisual = '';
  if (layout === 'memoriam') {
    sharedVisual = heroPhotoShared(imageSrc, 'circle-grayscale');
  } else if (layout === 'gallery') {
    const galleryField = fields.find((f) => f.type === 'gallery');
    sharedVisual = galleryField ? galleryGridShared(values[galleryField.key] ?? []) : '';
  } else if (imageSrc) {
    sharedVisual = heroPhotoShared(imageSrc, 'photo');
  }

  return `<div style="background-color:${BLACK};max-width:640px;margin:0 auto;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${DARK_IRON};">
    <tr>
      <td style="padding:20px 30px;font-family:'Barlow Condensed',Arial,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${WHITE};font-size:15px;">APEX</td>
      <td style="padding:20px 30px;text-align:right;">
        <span style="background-color:rgba(255,192,0,0.12);color:${GOLD};font-size:10.5px;font-weight:700;padding:5px 10px;text-transform:uppercase;letter-spacing:0.05em;">${esc(templateName)}</span>
      </td>
    </tr>
  </table>
  ${subjectEn || subjectAr ? '' : ''}
  ${sharedVisual}
  ${en}
  <div style="height:1px;background-color:${CHARCOAL};margin:0 30px;"></div>
  ${ar}
  <div style="background-color:${CHARCOAL};padding:18px 30px;color:${ASH};font-size:11px;line-height:1.6;">
    Internal communication — please do not forward externally &middot; رسالة داخلية لا تُرسل خارجياً
  </div>
</div>`;
}
