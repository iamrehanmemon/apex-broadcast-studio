import {
  TrendingUp, BookOpen, ShieldCheck, Cake, Baby, Flower2, Users, Trophy,
  Newspaper, Award, Star, GraduationCap, Lightbulb, Clock, Sparkles, PartyPopper, Rocket, type LucideIcon,
} from 'lucide-react';
import { Cr133_announcementtemplatescr133_category } from '../generated/models/Cr133_announcementtemplatesModel';
import type { Cr133_announcementtemplates } from '../generated/models/Cr133_announcementtemplatesModel';

interface Props {
  templates: Cr133_announcementtemplates[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  view: 'compose' | 'history';
  onSelect: (id: string) => void;
  onHistory: () => void;
}

const CATEGORY_ICON: Record<number, LucideIcon> = {
  100000000: TrendingUp,
  100000001: BookOpen,
  100000002: ShieldCheck,
  100000003: Cake,
  100000004: Baby,
  100000005: Flower2,
  100000006: Users,
  100000007: Trophy,
  100000008: Newspaper,
  100000009: Award,
  100000010: Star,
  100000011: GraduationCap,
  100000012: Lightbulb,
  100000013: Sparkles,
  100000014: PartyPopper,
  100000015: Rocket,
};

export default function Sidebar({ templates, loading, error, selectedId, view, onSelect, onHistory }: Props) {
  const grouped = new Map<number, Cr133_announcementtemplates[]>();
  for (const t of templates) {
    const cat = t.cr133_category ?? 0;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(t);
  }

  return (
    <div style={{ background: 'var(--dark-iron)', borderRight: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '0.04em', color: 'var(--white)' }}>
          APEX
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--gold)', letterSpacing: '0.12em', marginTop: 2 }}>BROADCAST</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
        {loading && <p style={{ color: 'var(--ash)', fontSize: '0.8rem', padding: '0 10px' }}>Loading…</p>}
        {error && (
          <p style={{ color: '#f87171', fontSize: '0.78rem', padding: '0 10px' }}>
            This app is for HR/Communications team members. Contact HR for access.
          </p>
        )}

        {[...grouped.entries()].map(([cat, items]) => {
          const Icon = CATEGORY_ICON[cat] ?? Newspaper;
          return (
            <div key={cat} style={{ marginBottom: '1.1rem' }}>
              <div style={{ fontSize: '0.66rem', color: 'var(--steel)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 6 }}>
                {Cr133_announcementtemplatescr133_category[cat as keyof typeof Cr133_announcementtemplatescr133_category] ?? 'Other'}
              </div>
              {items.map((t) => {
                const active = view === 'compose' && selectedId === t.cr133_announcementtemplateid;
                return (
                  <button
                    key={t.cr133_announcementtemplateid}
                    onClick={() => onSelect(t.cr133_announcementtemplateid)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                      fontWeight: 400,
                      fontFamily: 'var(--font-body)',
                      background: active ? 'var(--gold)' : 'transparent',
                      color: active ? 'var(--black)' : 'var(--smoke)',
                      padding: '0.55em 0.6em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      fontSize: '0.85rem',
                    }}
                    className={active ? '' : 'sidebar-item'}
                  >
                    <Icon size={15} color={active ? 'var(--black)' : 'var(--gold)'} strokeWidth={1.75} />
                    {t.cr133_name}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', padding: '12px' }}>
        <button
          onClick={onHistory}
          style={{
            width: '100%', textAlign: 'left', textTransform: 'none', letterSpacing: 'normal', fontWeight: 400,
            background: view === 'history' ? 'var(--gold)' : 'transparent',
            color: view === 'history' ? 'var(--black)' : 'var(--smoke)',
            padding: '0.55em 0.6em', display: 'flex', alignItems: 'center', gap: 9, fontSize: '0.85rem',
          }}
          className={view === 'history' ? '' : 'sidebar-item'}
        >
          <Clock size={15} color={view === 'history' ? 'var(--black)' : 'var(--gold)'} strokeWidth={1.75} />
          History
        </button>
      </div>

      <style>{`.sidebar-item:hover { background: var(--charcoal) !important; }`}</style>
    </div>
  );
}
