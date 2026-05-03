import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="page-header">
        <h1>🐹 仓鼠</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/parts')}>
          <div className="stat-num">--</div>
          <div className="stat-label">零件总数</div>
        </div>
        <div className="stat-card warning" onClick={() => navigate('/parts')}>
          <div className="stat-num">--</div>
          <div className="stat-label">⚠️ 库存不足</div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={() => navigate('/parts/new')}
        >
          ➕ 添加新零件
        </button>
      </div>

      <div style={{ padding: '20px 16px', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>
        <p>连接 Supabase 后这里会显示实时数据</p>
        <p style={{ marginTop: '8px' }}>先注册 <a href="https://supabase.com" target="_blank" rel="noopener">Supabase</a> 账号</p>
      </div>
    </div>
  );
}