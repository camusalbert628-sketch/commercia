import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Store, DollarSign, Activity, CheckCircle, Ban } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>('/admin/stats');
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchAdminStats();
    }
  }, [user]);

  const toggleUserStatus = async (userId: string) => {
    try {
      await api.put(`/admin/users/${userId}/toggle`);
      fetchAdminStats();
    } catch (e: any) {
      alert(e.message || 'Erreur.');
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: '#DC2626', fontSize: '2rem', marginBottom: '16px' }}>⛔</div>
        <h2>Accès Réservé aux Administrateurs</h2>
        <p style={{ color: '#64748B' }}>Cette section requiert un compte administrateur COMMERCIA.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ color: '#059669', fontWeight: 700 }}>Chargement des données administratives...</div>
      </div>
    );
  }

  const m = stats?.metrics || {
    totalUsers: 0,
    totalBusinesses: 0,
    totalSalesVolume: 0,
    totalSalesCount: 0,
    activeSubscriptionsCount: 0,
    estimatedMRR: 0,
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div
          style={{
            background: '#EFF6FF',
            color: '#2563EB',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
          }}
        >
          <ShieldAlert size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Console d'Administration SaaS</h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
            Supervision globale de la plateforme COMMERCIA
          </p>
        </div>
      </div>

      {/* Global SaaS KPIs */}
      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Revenu Récurrent (MRR)</div>
            <div className="stat-value" style={{ color: '#059669' }}>
              {m.estimatedMRR.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              {m.activeSubscriptionsCount} abonné(s) payant(s)
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Volume d'affaires traité</div>
            <div className="stat-value">{m.totalSalesVolume.toLocaleString('fr-FR')} FCFA</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              {m.totalSalesCount} ventes enregistrées
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <Activity size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Entrepreneurs Inscrits</div>
            <div className="stat-value">{m.totalUsers}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              {m.totalBusinesses} commerce(s) actif(s)
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#F1F5F9', color: '#334155' }}>
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Recent Users List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Utilisateurs Récents</h3>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email & Téléphone</th>
                <th>Plan</th>
                <th>Commerces</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentUsers.map((u: any) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td>
                    <div>{u.email}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{u.phone || 'Non renseigné'}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: u.plan === 'Pro' ? '#ECFDF5' : u.plan === 'Business Multi-Activités' ? '#EFF6FF' : '#F1F5F9',
                        color: u.plan === 'Pro' ? '#059669' : u.plan === 'Business Multi-Activités' ? '#2563EB' : '#64748B',
                      }}
                    >
                      {u.plan}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{u.businessCount} activité(s)</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: u.isActive ? '#059669' : '#DC2626',
                      }}
                    >
                      {u.isActive ? <CheckCircle size={14} /> : <Ban size={14} />}
                      {u.isActive ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={`btn ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => toggleUserStatus(u.id)}
                    >
                      {u.isActive ? 'Suspendre' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
