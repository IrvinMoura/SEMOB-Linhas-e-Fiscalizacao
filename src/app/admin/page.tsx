'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  LogOut, 
  Home, 
  Plus, 
  Edit, 
  MapPin, 
  Save, 
  Trash, 
  Undo, 
  CheckCircle,
  Calendar,
  AlertTriangle,
  Info,
  Map,
  Clock,
  ArrowLeft
} from 'lucide-react';
import BusMapDynamic from '@/components/BusMapDynamic';
import styles from '@/styles/admin.module.css';

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

export default function Admin() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submittingLogin, setSubmittingLogin] = useState(false);

  // Dashboard Data State
  const [lines, setLines] = useState<BusLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [activeTab, setActiveTab] = useState<'consulta' | 'nova' | 'editar' | 'final'>('consulta');

  // Messages / Toast feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Tab: Nova Linha State
  const [newCodigo, setNewCodigo] = useState('');
  const [newNome, setNewNome] = useState('');

  // Tab: Editar Linha State
  const [selectedEditLineId, setSelectedEditLineId] = useState<number | null>(null);
  const [editCodigo, setEditCodigo] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editAtiva, setEditAtiva] = useState(true);

  // Tab: Final / Rota / Horários Editor State
  const [selectedEditorLineId, setSelectedEditorLineId] = useState<number | null>(null);
  // Terminal fields
  const [termRua, setTermRua] = useState('');
  const [termBairro, setTermBairro] = useState('');
  const [termLat, setTermLat] = useState('');
  const [termLon, setTermLon] = useState('');
  // Map / Route fields
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [staticMapUrl, setStaticMapUrl] = useState('');
  // Schedules fields
  const [localHorarios, setLocalHorarios] = useState<Omit<Schedule, 'id'>[]>([]);
  const [newHorarioTime, setNewHorarioTime] = useState('');
  const [newHorarioDia, setNewHorarioDia] = useState<'UTIL' | 'SABADO' | 'DOMINGO'>('UTIL');
  const [newHorarioObs, setNewHorarioObs] = useState('');

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth');
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          fetchDashboardData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // Fetch data
  async function fetchDashboardData() {
    try {
      setLoadingLines(true);
      const res = await fetch('/api/linhas');
      const data = await res.json();
      if (data.success) {
        setLines(data.lines);
      }
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao carregar linhas do banco.', 'error');
    } finally {
      setLoadingLines(false);
    }
  }

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmittingLogin(true);
    
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        fetchDashboardData();
      } else {
        setLoginError(data.message || 'Erro ao realizar login');
      }
    } catch (err) {
      setLoginError('Não foi possível conectar ao servidor.');
    } finally {
      setSubmittingLogin(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setIsAuthenticated(false);
      setUsername('');
      setPassword('');
    } catch (err) {
      console.error(err);
    }
  };

  // Feedback display utility
  const showFeedback = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Tab: Nova Linha submit
  const handleCreateLineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodigo || !newNome) {
      showFeedback('Por favor, preencha todos os campos.', 'error');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/linhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: newCodigo, nome: newNome })
      });
      
      const data = await res.json();
      if (data.success) {
        showFeedback('Linha cadastrada com sucesso!', 'success');
        setNewCodigo('');
        setNewNome('');
        fetchDashboardData();
        setActiveTab('consulta');
      } else {
        showFeedback(data.message || 'Erro ao cadastrar linha', 'error');
      }
    } catch (err) {
      showFeedback('Erro de conexão.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Sync edit line form fields when selected line changes
  useEffect(() => {
    if (selectedEditLineId !== null) {
      const line = lines.find(l => l.id === selectedEditLineId);
      if (line) {
        setEditCodigo(line.codigo);
        setEditNome(line.nome);
        setEditAtiva(line.ativa);
      }
    }
  }, [selectedEditLineId, lines]);

  // Tab: Editar Linha details submit
  const handleEditLineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditLineId || !editCodigo || !editNome) {
      showFeedback('Campos obrigatórios ausentes.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/linhas/detalhes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedEditLineId, 
          codigo: editCodigo, 
          nome: editNome, 
          ativa: editAtiva 
        })
      });

      const data = await res.json();
      if (data.success) {
        showFeedback('Linha atualizada com sucesso!', 'success');
        fetchDashboardData();
        setActiveTab('consulta');
      } else {
        showFeedback(data.message || 'Erro ao atualizar linha', 'error');
      }
    } catch (err) {
      showFeedback('Erro de conexão.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Sync editor fields for Terminal/Map/Schedules
  useEffect(() => {
    if (selectedEditorLineId !== null) {
      const line = lines.find(l => l.id === selectedEditorLineId);
      if (line) {
        setTermRua(line.terminal.rua || '');
        setTermBairro(line.terminal.bairro || '');
        setTermLat(line.terminal.latitude?.toString() || '');
        setTermLon(line.terminal.longitude?.toString() || '');
        setRouteCoords(line.mapa.coordenadas_rota || []);
        setStaticMapUrl(line.mapa.url_imagem || '');
        
        // Flatten schedules for editor list
        const flattened = [
          ...line.horarios.UTIL,
          ...line.horarios.SABADO,
          ...line.horarios.DOMINGO
        ].map(h => ({
          tipo_dia: h.tipo_dia,
          horario: h.horario,
          observacao: h.observacao
        }));
        
        setLocalHorarios(flattened);
      }
    } else {
      setTermRua('');
      setTermBairro('');
      setTermLat('');
      setTermLon('');
      setRouteCoords([]);
      setStaticMapUrl('');
      setLocalHorarios([]);
    }
  }, [selectedEditorLineId, lines]);

  // Timetable Add/Delete handlers (local only, saved upon clicking save button)
  const addHorarioLocal = () => {
    if (!newHorarioTime) {
      showFeedback('Digite um horário (HH:MM).', 'error');
      return;
    }
    
    // Check duplicates
    const exists = localHorarios.some(
      h => h.tipo_dia === newHorarioDia && h.horario === newHorarioTime
    );
    if (exists) {
      showFeedback('Este horário já está adicionado.', 'error');
      return;
    }

    setLocalHorarios(prev => [
      ...prev,
      {
        tipo_dia: newHorarioDia,
        horario: newHorarioTime,
        observacao: newHorarioObs
      }
    ].sort((a, b) => {
      // Sort first by day type, then by time
      const days = { UTIL: 1, SABADO: 2, DOMINGO: 3 };
      if (a.tipo_dia !== b.tipo_dia) {
        return days[a.tipo_dia] - days[b.tipo_dia];
      }
      return a.horario.localeCompare(b.horario);
    }));

    setNewHorarioTime('');
    setNewHorarioObs('');
  };

  const removeHorarioLocal = (index: number) => {
    setLocalHorarios(prev => prev.filter((_, i) => i !== index));
  };

  // Tab: Final / Rota / Horários full submit
  const handleSaveItinerarySubmit = async () => {
    if (!selectedEditorLineId) {
      showFeedback('Por favor, selecione uma linha.', 'error');
      return;
    }

    setSaving(true);
    try {
      const latVal = termLat.trim() ? parseFloat(termLat) : null;
      const lonVal = termLon.trim() ? parseFloat(termLon) : null;

      // 1. Save Terminal Details (Final de Linha)
      const termRes = await fetch('/api/linhas/final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linha_id: selectedEditorLineId,
          rua: termRua,
          bairro: termBairro,
          latitude: latVal,
          longitude: lonVal
        })
      });

      const termData = await termRes.json();
      if (!termData.success) {
        throw new Error(termData.message || 'Erro ao salvar terminal');
      }

      // 2. Save Route/Itinerary Coordinates and Static Map Image
      const routeRes = await fetch('/api/linhas/rota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linha_id: selectedEditorLineId,
          coordenadas: routeCoords,
          url_imagem: staticMapUrl
        })
      });

      const routeData = await routeRes.json();
      if (!routeData.success) {
        throw new Error(routeData.message || 'Erro ao salvar rota/itinerário');
      }

      // 3. Save Timetables (Horários)
      const schedRes = await fetch('/api/linhas/horarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linha_id: selectedEditorLineId,
          horarios: localHorarios
        })
      });

      const schedData = await schedRes.json();
      if (!schedData.success) {
        throw new Error(schedData.message || 'Erro ao salvar horários');
      }

      showFeedback('Informações do itinerário atualizadas com sucesso!', 'success');
      fetchDashboardData();
    } catch (err: any) {
      showFeedback(err.message || 'Erro de conexão.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRouteCoordsUpdateFromMap = (coords: [number, number][]) => {
    setRouteCoords(coords);
  };

  const triggerEditorForLine = (lineId: number) => {
    setSelectedEditorLineId(lineId);
    setActiveTab('final');
  };

  const triggerEditForLine = (lineId: number) => {
    setSelectedEditLineId(lineId);
    setActiveTab('editar');
  };

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--text-muted)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Render Login Panel if not authenticated
  if (!isAuthenticated) {
    return (
      <main className={styles.loginContainer}>
        <div className={`glass ${styles.loginCard}`}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔐</div>
          <h1 className={styles.loginTitle}>SEMOB Admin</h1>
          <p className={styles.loginSubtitle}>Faça login para gerenciar linhas, horários e desenhar rotas</p>

          {loginError && (
            <div className={styles.errorAlert}>
              <AlertTriangle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="user">Usuário</label>
              <input
                id="user"
                type="text"
                className={styles.input}
                placeholder="Ex: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="pwd">Senha</label>
              <input
                id="pwd"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className={styles.button}
              disabled={submittingLogin}
            >
              {submittingLogin ? 'Autenticando...' : 'Entrar no Painel'}
            </button>
          </form>

          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '1.8rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Voltar ao Portal Público
          </Link>
        </div>
      </main>
    );
  }

  // Render Dashboard if authenticated
  return (
    <main className={styles.dashboardContainer}>
      
      {/* feedback toast alerts */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'var(--success-bg)',
          color: 'var(--success)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          padding: '12px 20px',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '12px 20px',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <AlertTriangle size={18} />
          {errorMessage}
        </div>
      )}

      {/* Admin header */}
      <header className={styles.adminHeader}>
        <div className={styles.headerTitle}>
          <span>⚙️</span>
          <h1>Painel Administrativo SEMOB</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--card-border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            textDecoration: 'none'
          }}>
            <Home size={13} />
            <span>Portal Público</span>
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={13} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className={styles.tabList}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'consulta' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('consulta')}
        >
          🔎 Consultar Linhas
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'nova' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('nova')}
        >
          ➕ Nova Linha
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'editar' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('editar')}
        >
          ✏️ Editar Linha
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'final' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('final')}
        >
          📍 Final, Mapa e Horários
        </button>
      </nav>

      {/* Panels components */}
      <section className={styles.tabContent}>
        
        {/* Tab 1: Consulta */}
        {activeTab === 'consulta' && (
          <div className="glass" style={{ padding: '1.5rem', animation: 'fadeIn 0.2s ease-out' }}>
            <h3 className={styles.sectionTitle}>🔎 Consultar Linhas Cadastradas</h3>
            {loadingLines ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando listagem...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 700 }}>Código</th>
                      <th style={{ padding: '12px 8px', fontWeight: 700 }}>Nome da Linha</th>
                      <th style={{ padding: '12px 8px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '12px 8px', fontWeight: 700 }}>Terminal Cadastrado</th>
                      <th style={{ padding: '12px 8px', fontWeight: 700 }}>Rota Desenhada</th>
                      <th style={{ padding: '12px 8px', fontWeight: 700 }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 700 }}>
                          <span style={{ background: 'var(--accent-primary)', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>{line.codigo}</span>
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>{line.nome}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ 
                            background: line.ativa ? 'var(--success-bg)' : 'var(--danger-bg)', 
                            color: line.ativa ? 'var(--success)' : 'var(--danger)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}>
                            {line.ativa ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {line.terminal.rua || line.terminal.bairro ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>📍 Sim</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Não</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {line.mapa.coordenadas_rota && line.mapa.coordenadas_rota.length > 0 ? (
                            <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                              🗺️ {line.mapa.coordenadas_rota.length} pt{line.mapa.coordenadas_rota.length !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Sem rota</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px', display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => triggerEditForLine(line.id)}
                            className={styles.deleteBtn}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                          >
                            ✏️ Dados
                          </button>
                          <button 
                            onClick={() => triggerEditorForLine(line.id)}
                            className={styles.deleteBtn}
                            style={{ background: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', color: 'white' }}
                          >
                            📍 Final / Horários
                          </button>
                          <Link 
                            href={`/admin/desenhar/${line.id}`}
                            className={styles.deleteBtn}
                            style={{ background: '#0284c7', border: '1px solid #0284c7', color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                          >
                            🖌️ Traçar Rota
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Nova Linha */}
        {activeTab === 'nova' && (
          <div className={`glass ${styles.formSection}`}>
            <h3 className={styles.sectionTitle}>➕ Cadastrar Nova Linha</h3>
            <form onSubmit={handleCreateLineSubmit} style={{ maxWidth: '600px' }}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="new_codigo">Código da Linha</label>
                <input
                  id="new_codigo"
                  type="text"
                  className={styles.input}
                  placeholder="Ex: 007"
                  value={newCodigo}
                  onChange={(e) => setNewCodigo(e.target.value)}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="new_nome">Nome da Linha</label>
                <input
                  id="new_nome"
                  type="text"
                  className={styles.input}
                  placeholder="Ex: Jardim Europa via Noide"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className={styles.button}
                disabled={saving}
              >
                {saving ? 'Gravando...' : 'Salvar Nova Linha'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Editar Linha */}
        {activeTab === 'editar' && (
          <div className={`glass ${styles.formSection}`}>
            <h3 className={styles.sectionTitle}>✏️ Editar Linha Existente</h3>
            <div className={styles.inputGroup} style={{ maxWidth: '600px', marginBottom: '2rem' }}>
              <label className={styles.label}>Selecione a Linha para Editar</label>
              <select 
                className={styles.input}
                value={selectedEditLineId || ''} 
                onChange={(e) => setSelectedEditLineId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">-- Selecione uma Linha --</option>
                {lines.map(l => (
                  <option key={l.id} value={l.id}>{l.codigo} - {l.nome}</option>
                ))}
              </select>
            </div>

            {selectedEditLineId !== null && (
              <form onSubmit={handleEditLineSubmit} style={{ maxWidth: '600px', animation: 'fadeIn 0.2s ease-out' }}>
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="edit_codigo">Código da Linha</label>
                  <input
                    id="edit_codigo"
                    type="text"
                    className={styles.input}
                    value={editCodigo}
                    onChange={(e) => setEditCodigo(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="edit_nome">Nome da Linha</label>
                  <input
                    id="edit_nome"
                    type="text"
                    className={styles.input}
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="edit_ativa"
                    type="checkbox"
                    checked={editAtiva}
                    onChange={(e) => setEditAtiva(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="edit_ativa" style={{ fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>Linha Ativa (Exibir no portal público)</label>
                </div>
                <button 
                  type="submit" 
                  className={styles.button}
                  disabled={saving}
                  style={{ marginTop: '1.5rem' }}
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 4: Final de Linha, Horários e Rota Editor (Leaflet Drawing) */}
        {activeTab === 'final' && (
          <div className="glass" style={{ padding: '1.5rem', animation: 'fadeIn 0.2s ease-out' }}>
            <h3 className={styles.sectionTitle}>📍 Gerenciar Final de Linha, Mapa e Horários</h3>
            
            <div className={styles.inputGroup} style={{ maxWidth: '600px', marginBottom: '1.5rem' }}>
              <label className={styles.label}>Selecione a Linha de Ônibus</label>
              <select 
                className={styles.input}
                value={selectedEditorLineId || ''} 
                onChange={(e) => setSelectedEditorLineId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">-- Selecione uma Linha --</option>
                {lines.map(l => (
                  <option key={l.id} value={l.id}>{l.codigo} - {l.nome}</option>
                ))}
              </select>
            </div>

            {selectedEditorLineId !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.25s ease-out' }}>
                
                {/* 4.1. Terminal Fields (Final de Linha) */}
                <div className="glass" style={{ padding: '1.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} color="var(--accent-primary)" /> Informações do Terminal (Final de Linha)
                  </h4>
                  <div className={styles.grid2Cols}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Avenida / Rua</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ex: Av. Antônio Ribeiro"
                        value={termRua}
                        onChange={(e) => setTermRua(e.target.value)}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Bairro</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ex: SIM"
                        value={termBairro}
                        onChange={(e) => setTermBairro(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.grid2Cols}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Latitude (Gerais de Feira: -12.257)</label>
                      <input
                        type="number"
                        step="0.000001"
                        className={styles.input}
                        placeholder="Ex: -12.230393"
                        value={termLat}
                        onChange={(e) => setTermLat(e.target.value)}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Longitude (Gerais de Feira: -38.959)</label>
                      <input
                        type="number"
                        step="0.000001"
                        className={styles.input}
                        placeholder="Ex: -38.883055"
                        value={termLon}
                        onChange={(e) => setTermLon(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 4.2. Route Editor Reference */}
                <div className="glass" style={{ padding: '1.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Map size={16} color="var(--accent-primary)" /> Traçado da Rota
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>O desenho do itinerário agora possui uma tela dedicada com divisão de tela para visualização do mapa original lado a lado com a ferramenta de desenho.</span>
                    
                    <span style={{ fontSize: '0.85rem', color: routeCoords.length > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                      Status atual: {routeCoords.length > 0 ? `🟢 Rota salva com ${routeCoords.length} pontos.` : '⚪ Nenhuma rota desenhada.'}
                    </span>

                    <Link 
                      href={`/admin/desenhar/${selectedEditorLineId}`}
                      className={styles.button}
                      style={{ background: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', width: 'auto' }}
                    >
                      <Map size={16} /> Abrir Tela de Desenho
                    </Link>
                  </div>
                </div>

                {/* 4.3. Timetable Editor (Horários) */}
                <div className="glass" style={{ padding: '1.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="var(--accent-primary)" /> Quadro de Horários de Partida
                  </h4>

                  <div className={styles.horariosEditor}>
                    <div className={styles.horarioForm}>
                      <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
                        <label className={styles.label}>Tipo de Dia</label>
                        <select 
                          className={styles.input}
                          value={newHorarioDia}
                          onChange={(e) => setNewHorarioDia(e.target.value as any)}
                        >
                          <option value="UTIL">Dias Úteis</option>
                          <option value="SABADO">Sábados</option>
                          <option value="DOMINGO">Domingos e Feriados</option>
                        </select>
                      </div>
                      <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
                        <label className={styles.label}>Horário (HH:MM)</label>
                        <input
                          type="time"
                          className={styles.input}
                          value={newHorarioTime}
                          onChange={(e) => setNewHorarioTime(e.target.value)}
                        />
                      </div>
                      <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
                        <label className={styles.label}>Observação (Opcional)</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Ex: Via Noide"
                          value={newHorarioObs}
                          onChange={(e) => setNewHorarioObs(e.target.value)}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={addHorarioLocal}
                        className={styles.button}
                        style={{ marginTop: 0, padding: '11px 18px', width: 'auto' }}
                      >
                        Adicionar
                      </button>
                    </div>

                    <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Lista de Horários ({localHorarios.length} adicionados):</span>
                      {localHorarios.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                          Nenhum horário adicionado na lista temporária. Digite e adicione acima.
                        </div>
                      ) : (
                        <div className={styles.horariosList}>
                          {localHorarios.map((h, idx) => {
                            const diaLabels = { UTIL: '🗓️ Útil', SABADO: '🗓️ Sábado', DOMINGO: '🗓️ Dom/Fer' };
                            const pillClasses = h.tipo_dia === 'UTIL' ? 'color-util' : h.tipo_dia === 'SABADO' ? 'color-sabado' : 'color-domingo';
                            
                            return (
                              <div key={idx} className={styles.horarioRow}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: h.tipo_dia === 'UTIL' ? 'rgba(59, 130, 246, 0.1)' : h.tipo_dia === 'SABADO' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                    color: h.tipo_dia === 'UTIL' ? '#2563eb' : h.tipo_dia === 'SABADO' ? '#ea580c' : '#7c3aed',
                                    border: '1px solid rgba(0,0,0,0.05)'
                                  }}>
                                    {diaLabels[h.tipo_dia]}
                                  </span>
                                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{h.horario}</span>
                                  {h.observacao && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>({h.observacao})</span>}
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => removeHorarioLocal(idx)}
                                  className={styles.deleteBtn}
                                  title="Remover horário"
                                >
                                  Excluir
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4.4. Unified Save Button */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setSelectedEditorLineId(null)}
                    className={styles.logoutBtn}
                    style={{ padding: '12px 24px', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItinerarySubmit}
                    className={styles.button}
                    disabled={saving}
                    style={{ margin: 0, width: 'auto', padding: '12px 30px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Save size={16} />
                    {saving ? 'Gravando Informações...' : 'Salvar Todas as Informações do Itinerário'}
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

      </section>
    </main>
  );
}
