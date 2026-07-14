import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Upload, Monitor, Smartphone } from 'lucide-react';
import { getContext } from '@microsoft/power-apps/app';
import { Cr133_announcementtemplatesService } from '../generated/services/Cr133_announcementtemplatesService';
import { Cr133_announcementsService } from '../generated/services/Cr133_announcementsService';
import { SendAnnouncementEmailService } from '../generated/services/SendAnnouncementEmailService';
import {
  parseFieldSchema,
  buildInitialValues,
  renderEmailHtml,
  type FieldDef,
  type FieldValues,
  type LayoutKey,
} from '../lib/emailRenderer';
import { decodeImageToDataUrl, getCroppedImage, placeholderImage } from '../lib/imageUtils';
import ImageCropModal from '../components/ImageCropModal';
import type { Area } from 'react-easy-crop';
import { DEFAULT_RECIPIENTS } from '../config';

interface Props {
  templateId: string;
}

type Toast = { kind: 'success' | 'error'; message: string };
type Lang = 'en' | 'ar' | 'both';

const LAYOUT_NAME: Record<number, LayoutKey> = {
  100000000: 'message',
  100000001: 'spotlight',
  100000002: 'celebration',
  100000003: 'memoriam',
  100000004: 'condolence',
  100000005: 'stats',
  100000006: 'event',
  100000007: 'bulletins',
  100000008: 'gallery',
};

export default function Compose({ templateId }: Props) {
  const [templateName, setTemplateName] = useState('');
  const [layout, setLayout] = useState<LayoutKey>('message');
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [requiresImage, setRequiresImage] = useState(false);
  const [loading, setLoading] = useState(true);

  const [subjectEn, setSubjectEn] = useState('');
  const [subjectAr, setSubjectAr] = useState('');
  const [values, setValues] = useState<FieldValues>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined);
  const [cropSource, setCropSource] = useState<string | null>(null);

  const [previewHeight, setPreviewHeight] = useState(620);
  const [lang, setLang] = useState<Lang>('both');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  const [announcementId, setAnnouncementId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState(DEFAULT_RECIPIENTS);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingReal, setSendingReal] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    setAnnouncementId(null);
    setImageFile(null);
    setRecipients(DEFAULT_RECIPIENTS);
    setConfirmingSend(false);
    (async () => {
      const result = await Cr133_announcementtemplatesService.get(templateId, {
        select: ['cr133_name', 'cr133_fieldschema', 'cr133_layout', 'cr133_requiresimage'],
      });
      if (result.data) {
        setTemplateName(result.data.cr133_name ?? '');
        setLayout(LAYOUT_NAME[result.data.cr133_layout as number] ?? 'message');
        const schema = parseFieldSchema(result.data.cr133_fieldschema);
        setFields(schema.fields);
        setValues(buildInitialValues(schema.fields));
        setSubjectEn(schema.subjectExampleEn ?? '');
        setSubjectAr(schema.subjectExampleAr ?? '');
        const needsImage = !!result.data.cr133_requiresimage;
        setRequiresImage(needsImage);
        setImagePreviewUrl(needsImage ? placeholderImage(result.data.cr133_name ?? 'Photo') : undefined);
      }
      setLoading(false);
    })();
  }, [templateId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const previewHtml = useMemo(
    () => renderEmailHtml({ layout, fields, values, subjectEn, subjectAr, templateName, imageSrc: imagePreviewUrl }),
    [layout, fields, values, subjectEn, subjectAr, templateName, imagePreviewUrl]
  );

  const setValue = (key: string, val: any) => setValues((prev) => ({ ...prev, [key]: val }));

  const cropAspect = layout === 'memoriam' ? 1 : 16 / 9;

  const handleImagePick = async (file: File) => {
    try {
      const dataUrl = await decodeImageToDataUrl(file);
      setCropSource(dataUrl);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Could not process that image.' });
    }
  };

  const handleCropConfirm = async (cropPixels: Area) => {
    if (!cropSource) return;
    try {
      const [outW, outH] = cropAspect === 1 ? [480, 480] : [800, 450];
      const { file: cropped, dataUrl } = await getCroppedImage(cropSource, cropPixels, outW, outH);
      setImageFile(cropped);
      setImagePreviewUrl(dataUrl);
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Could not crop that image.' });
    } finally {
      setCropSource(null);
    }
  };

  /** Creates/updates the Announcement row and returns its ID. Shared by Save Draft and the Test/Send actions, which must persist the latest content before invoking the flow. */
  const persistDraft = async (): Promise<string> => {
    const renderedHtml = renderEmailHtml({ layout, fields, values, subjectEn, subjectAr, templateName, imageSrc: imagePreviewUrl });
    const record = {
      cr133_name: subjectEn || templateName,
      cr133_subjecten: subjectEn,
      cr133_subjectar: subjectAr,
      cr133_bodyfieldsjson: JSON.stringify(values),
      cr133_renderedhtml: renderedHtml,
      cr133_recipients: recipients,
      'cr133_Template@odata.bind': `/cr133_announcementtemplates(${templateId})`,
    };

    let id = announcementId;
    if (id) {
      const result = await Cr133_announcementsService.update(id, record);
      if (result.error) throw new Error(result.error.message);
    } else {
      // ownerid/owneridtype/statecode are server-defaulted on create; the generated
      // Base type marks them required even though the API doesn't need them here.
      const result = await Cr133_announcementsService.create({ ...record, cr133_status: 100000000 } as any);
      if (result.error) throw new Error(result.error.message);
      id = result.data.cr133_announcementid;
      setAnnouncementId(id);
    }

    if (imageFile && id) {
      const uploadResult = await Cr133_announcementsService.upload(id, 'cr133_image', imageFile);
      if (uploadResult.error) throw new Error(uploadResult.error.message);
    }

    return id;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await persistDraft();
      setToast({ kind: 'success', message: 'Draft saved.' });
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to save draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const id = await persistDraft();
      const ctx = await getContext();
      const testEmail = ctx.user.userPrincipalName;
      if (!testEmail) throw new Error('Could not determine your email address.');
      const result = await SendAnnouncementEmailService.Run({ text: id, text_1: 'Test', text_2: testEmail });
      if (result.error) throw new Error(result.error.message);
      setToast({ kind: 'success', message: `Test email sent to ${testEmail}.` });
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to send test email.' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendReal = async () => {
    setSendingReal(true);
    try {
      const id = await persistDraft();
      const result = await SendAnnouncementEmailService.Run({ text: id, text_1: 'Send' });
      if (result.error) throw new Error(result.error.message);
      setToast({ kind: 'success', message: `Sent to ${recipients}.` });
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to send.' });
    } finally {
      setSendingReal(false);
      setConfirmingSend(false);
    }
  };

  const showEn = lang === 'en' || lang === 'both';
  const showAr = lang === 'ar' || lang === 'both';

  if (loading) {
    return (
      <div style={{ padding: '3rem' }}>
        <p style={{ color: 'var(--ash)' }}>Loading template…</p>
      </div>
    );
  }

  return (
    <>
      {cropSource && (
        <ImageCropModal
          imageSrc={cropSource}
          aspect={cropAspect}
          cropShape={layout === 'memoriam' ? 'round' : 'rect'}
          onCancel={() => setCropSource(null)}
          onConfirm={handleCropConfirm}
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 480px) 1fr', minHeight: '100vh' }}>
      {/* Form column */}
      <div style={{ borderRight: '1px solid var(--border-dim)', background: 'var(--dark-iron)' }}>
        <div style={{ padding: '24px 26px', borderBottom: '1px solid var(--border-dim)' }}>
          <h1 style={{ fontSize: '1.4rem' }}>{templateName}</h1>
          <p style={{ color: 'var(--ash)', fontSize: '0.8rem', margin: '4px 0 0' }}>Content updates the preview live.</p>
        </div>

        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: showEn && showAr ? '1fr 1fr' : '1fr', gap: '1rem' }}>
            {showEn && (
              <div>
                <label>Subject (EN)</label>
                <input style={{ width: '100%' }} value={subjectEn} onChange={(e) => setSubjectEn(e.target.value)} />
              </div>
            )}
            {showAr && (
              <div>
                <label>Subject (AR)</label>
                <input style={{ width: '100%', direction: 'rtl', fontFamily: 'var(--font-ar)' }} value={subjectAr} onChange={(e) => setSubjectAr(e.target.value)} />
              </div>
            )}
          </div>

          {requiresImage && (
            <div>
              <label>Photo</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: '1px solid var(--border-dim)', cursor: 'pointer', position: 'relative', aspectRatio: '640/300', background: 'var(--charcoal)' }}
              >
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--steel)', fontSize: '0.8rem', gap: 6 }}>
                    <Upload size={14} /> Click to upload
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImagePick(file);
                }}
              />
            </div>
          )}

          {fields.map((f) => (
            <FieldEditor key={f.key} field={f} value={values[f.key]} onChange={(v) => setValue(f.key, v)} showEn={showEn} showAr={showAr} />
          ))}
        </div>
      </div>

      {/* Preview column */}
      <div>
        <div style={{ position: 'sticky', top: 0, background: 'var(--black)', borderBottom: '1px solid var(--border-dim)', padding: '16px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <Segmented value={lang} onChange={(v) => setLang(v as Lang)} options={[{ v: 'en', l: 'EN' }, { v: 'ar', l: 'AR' }, { v: 'both', l: 'Both' }]} />
            <Segmented
              value={device}
              onChange={(v) => setDevice(v as 'desktop' | 'mobile')}
              options={[{ v: 'desktop', l: <Monitor size={14} /> }, { v: 'mobile', l: <Smartphone size={14} /> }]}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Distribution list address"
              style={{ width: 200, fontSize: '0.8rem' }}
              title="Recipient for the real send"
            />
            <button className="btn-ghost" onClick={handleSaveDraft} disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
            <button className="btn-ghost" onClick={handleSendTest} disabled={sendingTest}>{sendingTest ? 'Sending…' : 'Send Test to Me'}</button>
            {!confirmingSend ? (
              <button className="btn-accent" onClick={() => setConfirmingSend(true)} disabled={sendingReal || !recipients}>
                Send to Distribution List
              </button>
            ) : (
              <>
                <span style={{ fontSize: '0.78rem', color: 'var(--ash)' }}>Send to {recipients}?</span>
                <button className="btn-ghost" onClick={() => setConfirmingSend(false)} disabled={sendingReal}>Cancel</button>
                <button className="btn-accent" onClick={handleSendReal} disabled={sendingReal}>{sendingReal ? 'Sending…' : 'Confirm Send'}</button>
              </>
            )}
          </div>
        </div>

        {toast && (
          <div
            style={{
              margin: '16px 26px 0',
              padding: '0.7rem 1rem',
              border: `1px solid ${toast.kind === 'success' ? '#4ade80' : '#f87171'}`,
              color: toast.kind === 'success' ? '#4ade80' : '#f87171',
              fontSize: '0.85rem',
            }}
          >
            {toast.message}
          </div>
        )}

        <div style={{ padding: '30px 26px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: device === 'mobile' ? 380 : 660, maxWidth: '100%', transition: 'width 0.2s ease' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--steel)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Inbox preview</span>
              <span>{device}</span>
            </div>
            <div style={{ background: 'var(--black)', border: '1px solid var(--border-dim)' }}>
              <iframe
                title="preview"
                srcDoc={previewHtml}
                style={{ width: '100%', height: previewHeight, border: 'none', display: 'block' }}
                onLoad={(e) => {
                  const doc = (e.target as HTMLIFrameElement).contentDocument;
                  if (doc) setPreviewHeight(Math.max(320, doc.documentElement.scrollHeight));
                }}
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

function Segmented({ options, value, onChange }: { options: { v: string; l: React.ReactNode }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--border-dim)' }}>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          style={{
            padding: '0.5em 0.9em',
            fontSize: '0.72rem',
            background: value === o.v ? 'var(--gold)' : 'transparent',
            color: value === o.v ? 'var(--black)' : 'var(--ash)',
          }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
  showEn,
  showAr,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
  showEn: boolean;
  showAr: boolean;
}) {
  // Image fields are handled by the single dedicated photo dropzone above (gated on cr133_requiresimage),
  // not per-field here — rendering one would produce a confusing duplicate "Photo" text input.
  if (field.type === 'image') return null;

  if (field.type === 'bullets') {
    const items: Array<{ en: string; ar: string }> = value ?? [];
    return (
      <div>
        <label>{field.labelEn}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ border: '1px solid var(--border-dim)', padding: 9, position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {showEn && (
                <input
                  style={{ width: '100%' }}
                  placeholder="Point (EN)"
                  value={item.en}
                  onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, en: e.target.value } : x)))}
                />
              )}
              {showAr && (
                <input
                  style={{ width: '100%', direction: 'rtl', fontFamily: 'var(--font-ar)' }}
                  placeholder="نقطة"
                  value={item.ar}
                  onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, ar: e.target.value } : x)))}
                />
              )}
              {items.length > 1 && (
                <button className="btn-plain" onClick={() => onChange(items.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 4, right: 4, padding: 4 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => onChange([...items, { en: '', ar: '' }])}>
            <Plus size={14} /> Add Point
          </button>
        </div>
      </div>
    );
  }

  if (field.type === 'gallery') {
    const items: Array<{ en: string; ar: string; dataUrl?: string }> = value ?? [];
    return (
      <div>
        <label>{field.labelEn}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => (
            <GalleryItemEditor
              key={i}
              item={item}
              showEn={showEn}
              showAr={showAr}
              onChange={(next) => onChange(items.map((x, idx) => (idx === i ? next : x)))}
              onRemove={items.length > 1 ? () => onChange(items.filter((_, idx) => idx !== i)) : undefined}
            />
          ))}
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => onChange([...items, { en: '', ar: '' }])}>
            <Plus size={14} /> Add Photo
          </button>
        </div>
      </div>
    );
  }

  if (field.type === 'metrics') {
    const items: Array<{ en: string; ar: string; num: string; chg: string }> = value ?? [];
    return (
      <div>
        <label>{field.labelEn}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ border: '1px solid var(--border-dim)', padding: 9, position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {showEn && (
                <input
                  style={{ width: '100%' }}
                  placeholder="Label (EN)"
                  value={item.en}
                  onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, en: e.target.value } : x)))}
                />
              )}
              {showAr && (
                <input
                  style={{ width: '100%', direction: 'rtl', fontFamily: 'var(--font-ar)' }}
                  placeholder="التسمية"
                  value={item.ar}
                  onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, ar: e.target.value } : x)))}
                />
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ flex: 1 }} placeholder="Value" value={item.num} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, num: e.target.value } : x)))} />
                <input style={{ flex: 1 }} placeholder="Change" value={item.chg} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, chg: e.target.value } : x)))} />
              </div>
              {items.length > 1 && (
                <button className="btn-plain" onClick={() => onChange(items.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 4, right: 4, padding: 4 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => onChange([...items, { en: '', ar: '', num: '', chg: '' }])}>
            <Plus size={14} /> Add Metric
          </button>
        </div>
      </div>
    );
  }

  if (field.type === 'cta') {
    const v = value ?? { en: '', ar: '', url: '' };
    return (
      <div>
        <label>{field.labelEn}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {showEn && <input placeholder="Button text (EN)" value={v.en} onChange={(e) => onChange({ ...v, en: e.target.value })} />}
          {showAr && <input placeholder="نص الزر" style={{ direction: 'rtl', fontFamily: 'var(--font-ar)' }} value={v.ar} onChange={(e) => onChange({ ...v, ar: e.target.value })} />}
          <input placeholder="Link URL" value={v.url} onChange={(e) => onChange({ ...v, url: e.target.value })} />
        </div>
      </div>
    );
  }

  // text / textarea — textareas stack full-width (side-by-side gets cramped for long content),
  // single-line text fields stay side-by-side when both languages are shown.
  const v = value ?? { en: '', ar: '' };
  const isTextarea = field.type === 'textarea';
  const Input = isTextarea ? 'textarea' : 'input';
  const columns = isTextarea ? '1fr' : showEn && showAr ? '1fr 1fr' : '1fr';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, gap: '1rem' }}>
      {showEn && (
        <div>
          <label>{field.labelEn}</label>
          <Input
            style={{ width: '100%', minHeight: isTextarea ? 130 : undefined, resize: isTextarea ? 'vertical' : undefined }}
            value={v.en}
            onChange={(e: any) => onChange({ ...v, en: e.target.value })}
          />
        </div>
      )}
      {showAr && (
        <div>
          <label>{field.labelAr}</label>
          <Input
            style={{ width: '100%', minHeight: isTextarea ? 130 : undefined, resize: isTextarea ? 'vertical' : undefined, direction: 'rtl', fontFamily: 'var(--font-ar)' }}
            value={v.ar}
            onChange={(e: any) => onChange({ ...v, ar: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

function GalleryItemEditor({
  item,
  showEn,
  showAr,
  onChange,
  onRemove,
}: {
  item: { en: string; ar: string; dataUrl?: string };
  showEn: boolean;
  showAr: boolean;
  onChange: (v: { en: string; ar: string; dataUrl?: string }) => void;
  onRemove?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);

  const handlePick = async (file: File) => {
    try {
      const dataUrl = await decodeImageToDataUrl(file);
      setCropSource(dataUrl);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not process that image.');
    }
  };

  const handleCropConfirm = async (cropPixels: Area) => {
    if (!cropSource) return;
    try {
      const { dataUrl } = await getCroppedImage(cropSource, cropPixels, 400, 400);
      onChange({ ...item, dataUrl });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not crop that image.');
    } finally {
      setCropSource(null);
    }
  };

  return (
    <div style={{ border: '1px solid var(--border-dim)', padding: 9, position: 'relative', display: 'flex', gap: 10 }}>
      {cropSource && (
        <ImageCropModal imageSrc={cropSource} aspect={1} cropShape="rect" onCancel={() => setCropSource(null)} onConfirm={handleCropConfirm} />
      )}
      <div onClick={() => fileRef.current?.click()} style={{ width: 64, height: 64, flexShrink: 0, background: 'var(--charcoal)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.dataUrl ? (
          <img src={item.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Upload size={16} color="var(--steel)" />
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePick(f); }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {showEn && <input placeholder="Name / Caption (EN)" value={item.en} onChange={(e) => onChange({ ...item, en: e.target.value })} />}
        {showAr && <input placeholder="الاسم / التسمية" style={{ direction: 'rtl', fontFamily: 'var(--font-ar)' }} value={item.ar} onChange={(e) => onChange({ ...item, ar: e.target.value })} />}
      </div>
      {onRemove && (
        <button className="btn-plain" onClick={onRemove} style={{ position: 'absolute', top: 4, right: 4, padding: 4 }}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
