import { useEffect, useState } from 'react';
import { Cr133_announcementsService } from '../generated/services/Cr133_announcementsService';
import type { Cr133_announcements } from '../generated/models/Cr133_announcementsModel';

const STATUS_LABEL: Record<number, string> = {
  100000000: 'Draft',
  100000001: 'Test Sent',
  100000002: 'Sent',
};

export default function History() {
  const [rows, setRows] = useState<Cr133_announcements[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await Cr133_announcementsService.getAll({
        select: [
          'cr133_announcementid', 'cr133_name', 'cr133_status', 'cr133_templatename',
          'cr133_renderedhtml', 'createdon', 'cr133_testsentat', 'cr133_sentat',
        ],
        orderBy: ['createdon desc'],
        top: 100,
      });
      setRows(result.data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <header style={{ borderBottom: '1px solid var(--border-dim)', padding: '22px 40px' }}>
        <h1 style={{ fontSize: '1.6rem' }}>History</h1>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '30px 40px 80px' }}>
        {loading && <p style={{ color: 'var(--ash)' }}>Loading…</p>}
        {!loading && rows.length === 0 && <p style={{ color: 'var(--ash)' }}>No announcements yet.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-dim)' }}>
          {rows.map((r) => (
            <div key={r.cr133_announcementid} style={{ background: 'var(--dark-iron)' }}>
              <button
                onClick={() => setExpandedId(expandedId === r.cr133_announcementid ? null : r.cr133_announcementid)}
                style={{
                  width: '100%', textAlign: 'left', textTransform: 'none', letterSpacing: 'normal', fontWeight: 400,
                  display: 'flex', justifyContent: 'space-between', background: 'transparent', padding: '1rem 1.4rem',
                }}
              >
                <span>
                  <strong style={{ color: 'var(--white)', fontWeight: 600 }}>{r.cr133_name || '(untitled)'}</strong>{' '}
                  <span style={{ color: 'var(--ash)', fontSize: '0.82rem' }}>— {r.cr133_templatename}</span>
                </span>
                <span style={{ color: 'var(--gold)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  {STATUS_LABEL[r.cr133_status as number] ?? 'Unknown'}
                </span>
              </button>
              {expandedId === r.cr133_announcementid && (
                <div style={{ borderTop: '1px solid var(--border-dim)' }}>
                  <iframe title={r.cr133_announcementid} srcDoc={r.cr133_renderedhtml ?? ''} style={{ width: '100%', height: 480, border: 'none', display: 'block' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
