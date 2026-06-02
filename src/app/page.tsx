'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  Clock, 
  Bus, 
  ChevronDown, 
  ChevronUp, 
  Navigation, 
  Lock,
  Compass
} from 'lucide-react';
import BusMapDynamic from '@/components/BusMapDynamic';
import styles from '@/styles/home.module.css';

interface Schedule {
  id: number;
  tipo_dia: 'UTIL' | 'SABADO' | 'DOMINGO';
  horario: string;
  observacao: string;
}

interface BusLine {
  id: number;
  codigo: string;
  nome: string;
  ativa: boolean;
  terminal: {
    rua: string;
    bairro: string;
    referencia: string;
    latitude: number | null;
    longitude: number | null;
  };
  mapa: {
    url_imagem: string;
    descricao: string;
    coordenadas_rota: [number, number][];
  };
  horarios: {
    UTIL: Schedule[];
    SABADO: Schedule[];
    DOMINGO: Schedule[];
  };
}

export default function Home() {
  const [lines, setLines] = useState<BusLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [expandedLineId, setExpandedLineId] = useState<number | null>(null);
  const [expandedSchedules, setExpandedSchedules] = useState<{ [key: string]: boolean }>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Listen to popstate to toggle the sidebar when clicking the native phone back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (typeof window !== 'undefined' && window.innerWidth <= 900) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Fetch all bus lines once on mount
  useEffect(() => {
    async function fetchLines() {
      try {
        setLoading(true);
        const res = await fetch('/api/linhas');
        const data = await res.json();
        
        if (data.success) {
          setLines(data.lines);
          // Set initial selected and expanded line to the first one available
          if (data.lines.length > 0) {
            const firstActive = data.lines.find((l: BusLine) => l.ativa) || data.lines[0];
            setSelectedLineId(firstActive.id);
            setExpandedLineId(firstActive.id);
          }
        } else {
          setError(data.message || 'Erro ao carregar dados');
        }
      } catch (err) {
        console.error(err);
        setError('Não foi possível conectar ao servidor.');
      } finally {
        setLoading(false);
      }
    }
    fetchLines();
  }, []);

  // Local instant search filtering
  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) {
      return lines.filter(l => l.ativa);
    }
    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return lines.filter(l => {
      const codeMatches = l.codigo.toLowerCase().includes(query);
      const nameNormalized = l.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const nameMatches = nameNormalized.includes(query);
      const terminalStreet = l.terminal.rua?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || '';
      const terminalBairro = l.terminal.bairro?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || '';
      const locationMatches = terminalStreet.includes(query) || terminalBairro.includes(query);
      
      return (codeMatches || nameMatches || locationMatches);
    });
  }, [lines, searchQuery]);

  // Find currently active line for the map
  const activeLine = useMemo(() => {
    return lines.find(l => l.id === selectedLineId) || null;
  }, [lines, selectedLineId]);

  // Toggle timetable accordion section inside cards
  const toggleScheduleAccordion = (lineId: number, dayType: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card selection
    const key = `${lineId}_${dayType}`;
    setExpandedSchedules(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Toggle card expansion (to show/hide timetables, etc.)
  const handleCardClick = (lineId: number) => {
    setSelectedLineId(lineId);
    setExpandedLineId(expandedLineId === lineId ? null : lineId);
    
    // On mobile, clicking a line should show the map by closing the sidebar list
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setIsSidebarOpen(false);
      window.history.pushState({ view: 'map' }, '');
    }
  };

  return (
    <div className={styles.container}>
      {/* Premium Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <img src="/assets/Feira Logo.png" alt="Logo Feira de Santana" className={styles.logoImg} />
        </div>
      </header>

      {/* Main Grid View */}
      <div className={styles.mainLayout}>
        
        {/* Left Side: Sidebar with Search and List of Cards */}
        <div className={`${styles.sidebarWrapper} ${isSidebarOpen ? styles.sidebarWrapperOpen : styles.sidebarWrapperClosed}`}>
          <div 
            className={styles.sidebarHandleIcon} 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <span className={styles.handleIconText}>☰</span>
          </div>
          <section className={styles.sidebar}>
            
            {/* Smart Floating Search Bar */}
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} size={20} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar linha por código, nome ou bairro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={() => !isSidebarOpen && setIsSidebarOpen(true)}
                aria-label="Buscar linha de ônibus"
              />
            </div>

            {loading ? (
              // Shimmer / skeleton loading list
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="glass" style={{ height: '110px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.5 }}>
                    <div style={{ width: '40%', height: '16px', background: 'var(--text-muted)', borderRadius: '4px' }} />
                    <div style={{ width: '80%', height: '12px', background: 'var(--text-muted)', borderRadius: '4px' }} />
                    <div style={{ width: '60%', height: '10px', background: 'var(--text-muted)', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="glass" style={{ padding: '20px', color: 'var(--danger)', textAlign: 'center', fontWeight: 500 }}>
                ⚠️ {error}
              </div>
            ) : filteredLines.length === 0 ? (
              <div className="glass" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                🔍 Nenhuma linha de ônibus encontrada para a busca.
              </div>
            ) : (
              <>
                <div className={styles.searchCount}>
                  {filteredLines.length} linha{filteredLines.length !== 1 ? 's' : ''} encontrada{filteredLines.length !== 1 ? 's' : ''}
                </div>
                
                <div className={styles.linesList}>
                  {filteredLines.map((line) => {
                    const isSelected = selectedLineId === line.id;
                    const isExpanded = expandedLineId === line.id;

                    return (
                      <article 
                        key={line.id} 
                        className={`glass ${styles.lineCard} ${isSelected ? styles.lineCardActive : ''}`}
                        onClick={() => handleCardClick(line.id)}
                      >
                        <div className={styles.cardHeader}>
                          <span className={styles.codeBadge}>{line.codigo}</span>
                          <h2 className={styles.lineName}>{line.nome}</h2>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>

                        {/* Display Terminal address */}
                        {(line.terminal.rua || line.terminal.bairro) && (
                          <div className={styles.terminalInfo}>
                            <MapPin size={15} className={styles.terminalIcon} />
                            <span>
                              {line.terminal.rua ? `${line.terminal.rua}, ` : ''}
                              <strong>{line.terminal.bairro}</strong>
                            </span>
                          </div>
                        )}

                        {/* Expanded Section inside Card */}
                        {isExpanded && (
                          <div style={{ marginTop: '12px', animation: 'fadeIn 0.2s ease-out' }}>
                            
                            {/* Timetables Accordion */}
                            <div className={styles.schedulesSection}>
                              <div className={styles.scheduleHeader}>
                                <Clock size={14} />
                                <span>Horários de Partida (Final de Linha)</span>
                              </div>

                              {/* Dias Úteis */}
                              <div className={styles.scheduleAccordion}>
                                <button 
                                  className={styles.accordionTrigger}
                                  onClick={(e) => toggleScheduleAccordion(line.id, 'UTIL', e)}
                                >
                                  <span>🗓️ Dias Úteis ({line.horarios.UTIL.length})</span>
                                  {expandedSchedules[`${line.id}_UTIL`] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {expandedSchedules[`${line.id}_UTIL`] && (
                                  <div className={styles.accordionContent}>
                                    {line.horarios.UTIL.length === 0 ? (
                                      <div className={styles.emptyHorarios}>Nenhum horário cadastrado.</div>
                                    ) : (
                                      line.horarios.UTIL.map(h => (
                                        <span key={h.id} className={`${styles.horarioPill} ${styles.utilPill}`}>
                                          {h.horario}
                                          {h.observacao && <span className={styles.observacaoText}>({h.observacao})</span>}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Sábados */}
                              <div className={styles.scheduleAccordion}>
                                <button 
                                  className={styles.accordionTrigger}
                                  onClick={(e) => toggleScheduleAccordion(line.id, 'SABADO', e)}
                                >
                                  <span>🗓️ Sábados ({line.horarios.SABADO.length})</span>
                                  {expandedSchedules[`${line.id}_SABADO`] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {expandedSchedules[`${line.id}_SABADO`] && (
                                  <div className={styles.accordionContent}>
                                    {line.horarios.SABADO.length === 0 ? (
                                      <div className={styles.emptyHorarios}>Nenhum horário cadastrado.</div>
                                    ) : (
                                      line.horarios.SABADO.map(h => (
                                        <span key={h.id} className={`${styles.horarioPill} ${styles.sabadoPill}`}>
                                          {h.horario}
                                          {h.observacao && <span className={styles.observacaoText}>({h.observacao})</span>}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Domingos */}
                              <div className={styles.scheduleAccordion}>
                                <button 
                                  className={styles.accordionTrigger}
                                  onClick={(e) => toggleScheduleAccordion(line.id, 'DOMINGO', e)}
                                >
                                  <span>🗓️ Domingos e Feriados ({line.horarios.DOMINGO.length})</span>
                                  {expandedSchedules[`${line.id}_DOMINGO`] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {expandedSchedules[`${line.id}_DOMINGO`] && (
                                  <div className={styles.accordionContent}>
                                    {line.horarios.DOMINGO.length === 0 ? (
                                      <div className={styles.emptyHorarios}>Nenhum horário cadastrado.</div>
                                    ) : (
                                      line.horarios.DOMINGO.map(h => (
                                        <span key={h.id} className={`${styles.horarioPill} ${styles.domingoPill}`}>
                                          {h.horario}
                                          {h.observacao && <span className={styles.observacaoText}>({h.observacao})</span>}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* Quick Google Maps GPS Navigation link */}
                            {line.terminal.latitude && line.terminal.longitude && (
                              <div className={styles.cardActions}>
                                <a
                                  href={`https://www.google.com/maps?q=${line.terminal.latitude},${line.terminal.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${styles.actionBtn} ${styles.primaryAction}`}
                                  onClick={(e) => e.stopPropagation()} // Stop selection toggle
                                >
                                  <Navigation size={13} />
                                  Abrir GPS (Google Maps)
                                </a>
                              </div>
                            )}

                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Right Side: Sticky Interactive Map */}
        <section className={styles.mapContainer}>
          {/* Mobile Back Button */}
          {!isSidebarOpen && (
            <button 
              className={styles.mobileMenuBtn} 
              onClick={() => {
                setIsSidebarOpen(true);
                if (typeof window !== 'undefined' && window.history.state?.view === 'map') {
                  window.history.back();
                }
              }}
              aria-label="Voltar para a lista de linhas"
            >
              ☰ Linhas
            </button>
          )}

          {activeLine ? (
            <BusMapDynamic
              latitude={activeLine.terminal.latitude}
              longitude={activeLine.terminal.longitude}
              routeCoordinates={activeLine.mapa.coordenadas_rota}
              streetName={activeLine.terminal.rua}
              neighborhoodName={activeLine.terminal.bairro}
              lineCode={activeLine.codigo}
              lineName={activeLine.nome}
            />
          ) : (
            <div className={styles.mapPlaceholder}>
              <Compass className={styles.mapPlaceholderIcon} size={48} />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>Visualização de Rotas</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, maxWidth: '300px' }}>
                  Selecione uma linha de ônibus na barra lateral para ver o traçado interativo no mapa.
                </p>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
