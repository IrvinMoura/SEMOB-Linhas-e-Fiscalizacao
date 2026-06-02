import dynamic from 'next/dynamic';

const BusMapDynamic = dynamic(() => import('./BusMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      border: '1px dashed var(--card-border)',
      color: 'var(--text-secondary)'
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        border: '3px solid var(--text-muted)',
        borderTopColor: 'var(--accent-primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Carregando mapa interativo...</span>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
});

export default BusMapDynamic;
