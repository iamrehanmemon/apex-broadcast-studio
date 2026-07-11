import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Compose from './pages/Compose';
import History from './pages/History';
import { Cr133_announcementtemplatesService } from './generated/services/Cr133_announcementtemplatesService';
import type { Cr133_announcementtemplates } from './generated/models/Cr133_announcementtemplatesModel';

function App() {
  const [templates, setTemplates] = useState<Cr133_announcementtemplates[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'compose' | 'history'>('compose');

  useEffect(() => {
    (async () => {
      const result = await Cr133_announcementtemplatesService.getAll({
        select: ['cr133_announcementtemplateid', 'cr133_name', 'cr133_category', 'cr133_sortorder', 'cr133_isactive'],
        filter: 'cr133_isactive eq true',
        orderBy: ['cr133_sortorder asc'],
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        const data = result.data ?? [];
        setTemplates(data);
        if (data.length > 0) setSelectedId(data[0].cr133_announcementtemplateid);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
      <Sidebar
        templates={templates}
        loading={loading}
        error={error}
        selectedId={selectedId}
        view={view}
        onSelect={(id) => {
          setSelectedId(id);
          setView('compose');
        }}
        onHistory={() => setView('history')}
      />
      <main>
        {view === 'history' ? (
          <History />
        ) : selectedId ? (
          <Compose key={selectedId} templateId={selectedId} />
        ) : (
          <div style={{ padding: '3rem' }}>
            <p style={{ color: 'var(--ash)' }}>{loading ? 'Loading templates…' : 'No templates available.'}</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
