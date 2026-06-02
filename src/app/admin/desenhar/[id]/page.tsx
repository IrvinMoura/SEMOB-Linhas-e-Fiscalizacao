'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Map, Image as ImageIcon, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react';
import BusMapDynamic from '@/components/BusMapDynamic';
import styles from '@/styles/draw.module.css';

export default function DesenharRota({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lineName, setLineName] = useState('');
  const [lineCode, setLineCode] = useState('');
  const [staticMapUrl, setStaticMapUrl] = useState('');
  const [routeCoords, setRouteCoords] = useState<[number, number, string?][]>([]);
  const [termLat, setTermLat] = useState<number | null>(null);
  const [termLon, setTermLon] = useState<number | null>(null);
  const [imageZoom, setImageZoom] = useState(1);

  useEffect(() => {
    async function checkAuthAndLoadData() {
      try {
        const authRes = await fetch('/api/auth');
        const authData = await authRes.json();
        if (!authData.authenticated) {
          router.push('/admin');
          return;
        }

        const linesRes = await fetch('/api/linhas');
        const linesData = await linesRes.json();
        
        if (linesData.success) {
          const line = linesData.lines.find((l: any) => l.id === parseInt(resolvedParams.id));
          if (line) {
            setLineName(line.nome);
            setLineCode(line.codigo);
            setStaticMapUrl(line.mapa.url_imagem || '');
            setRouteCoords(line.mapa.coordenadas_rota || []);
            setTermLat(line.terminal.latitude);
            setTermLon(line.terminal.longitude);
          } else {
            setError('Linha não encontrada.');
          }
        }
      } catch (err) {
        setError('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    }
    
    checkAuthAndLoadData();
  }, [resolvedParams.id, router]);

  const handleSaveRoute = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/linhas/rota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linha_id: parseInt(resolvedParams.id),
          coordenadas: routeCoords,
          url_imagem: staticMapUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Rota salva com sucesso!');
        router.push('/admin');
      } else {
        alert('Erro ao salvar: ' + data.message);
      }
    } catch (err) {
      alert('Erro de conexão ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleRouteCoordsUpdateFromMap = (coords: [number, number, string?][]) => {
    setRouteCoords(coords);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Carregando ambiente de desenho...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <AlertTriangle color="var(--danger)" size={48} />
        <h2>{error}</h2>
        <Link href="/admin" className={styles.buttonSecondary}>Voltar ao Painel</Link>
      </div>
    );
  }

  return (
    <div className={styles.drawContainer}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <button onClick={() => router.push('/admin')} className={styles.buttonSecondary} style={{ padding: '6px' }} title="Voltar">
            <ArrowLeft size={18} />
          </button>
          <h1>Traçar Rota: {lineCode} - {lineName}</h1>
        </div>
        <div className={styles.headerActions}>
          <button 
            onClick={handleSaveRoute} 
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Traçado'}
          </button>
        </div>
      </header>

      <main className={styles.splitLayout}>
        {/* Left Side: Static Image Reference */}
        <section className={styles.leftPanel}>
          <div className={styles.controlsBar}>
            <ImageIcon size={18} color="var(--accent-primary)" />
            <div className={styles.inputGroup} style={{ flex: 1 }}>
              <input
                type="text"
                className={styles.input}
                placeholder="URL da Imagem Estática (Ex: https://pub-...)"
                value={staticMapUrl}
                onChange={(e) => setStaticMapUrl(e.target.value)}
              />
            </div>
            {staticMapUrl && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button 
                  className={styles.buttonSecondary} 
                  onClick={() => setImageZoom(z => Math.max(0.5, z - 0.2))} 
                  style={{ padding: '6px' }}
                  title="Diminuir Zoom"
                >
                  <ZoomOut size={16} />
                </button>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>
                  {Math.round(imageZoom * 100)}%
                </span>
                <button 
                  className={styles.buttonSecondary} 
                  onClick={() => setImageZoom(z => Math.min(5, z + 0.2))} 
                  style={{ padding: '6px' }}
                  title="Aumentar Zoom"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            )}
          </div>
          
          <div className={styles.imageContainer}>
            {staticMapUrl ? (
              <img 
                src={staticMapUrl} 
                alt="Referência" 
                className={styles.staticImage} 
                style={{ 
                  transform: `scale(${imageZoom})`, 
                  transition: 'transform 0.2s ease-out', 
                  transformOrigin: 'center center' 
                }} 
              />
            ) : (
              <div className={styles.noImage}>
                <ImageIcon size={48} opacity={0.5} />
                <span>Nenhuma imagem de referência definida.</span>
                <span style={{ fontSize: '0.8rem', textAlign: 'center', maxWidth: '300px' }}>Cole a URL da imagem estática do app legado acima para usar como guia.</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Interactive Leaflet Map */}
        <section className={styles.rightPanel}>
          <div className={styles.controlsBar}>
            <Map size={18} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Mapa de Edição</span>
            <div className={`${styles.statusIndicator} ${routeCoords.length > 0 ? styles.active : styles.inactive}`}>
              {routeCoords.length} pontos traçados
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <BusMapDynamic
              latitude={termLat}
              longitude={termLon}
              routeCoordinates={routeCoords}
              isEditing={true}
              onRouteUpdate={handleRouteCoordsUpdateFromMap}
              lineCode={lineCode}
              lineName={lineName}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
