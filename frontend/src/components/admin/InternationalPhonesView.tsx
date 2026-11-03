import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';

interface PhoneStats {
  totalNumbers: number;
  validFormat: number;
  invalidFormat: number;
  verified: number;
  unverified: number;
  countryDistribution: Record<string, number>;
  duplicatesCount: number;
  duplicates: Array<{ phone: string; count: number }>;
  needsCorrection: number;
  invalidSamples: Array<{ id: string; name?: string; phone: string; table: string }>;
}

export const InternationalPhonesView: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const [stats, setStats] = useState<PhoneStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNormalizing, setIsNormalizing] = useState<boolean>(false);
  const [normalizeResult, setNormalizeResult] = useState<any | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<PhoneStats>('/admin/security/phone-stats');
      setStats(res);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement des statistiques téléphoniques.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleNormalizeAll = async () => {
    if (!window.confirm('Voulez-vous lancer la normalisation E.164 contrôlée de tous les numéros en base de données ?')) return;
    setIsNormalizing(true);
    setNormalizeResult(null);
    try {
      const res = await api.post('/admin/security/phone-normalize-all', { defaultCountry: 'CM' });
      setNormalizeResult(res);
      loadStats();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la normalisation.');
    } finally {
      setIsNormalizing(false);
    }
  };

  const isLight = theme === 'light';
  const cardBg = isLight ? '#FFFFFF' : '#0F172A';
  const borderColor = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)';
  const textColor = isLight ? '#0F172A' : '#F8FAFC';
  const subTextColor = isLight ? '#64748B' : '#94A3B8';

  if (isLoading && !stats) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: subTextColor }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <div>Analyse du parc de numéros internationaux COMMERCIA...</div>
      </div>
    );
  }

  const validPercent = stats && stats.totalNumbers > 0 ? Math.round((stats.validFormat / stats.totalNumbers) * 100) : 100;
  const verifiedPercent = stats && stats.totalNumbers > 0 ? Math.round((stats.verified / stats.totalNumbers) * 100) : 0;

  return (
    <div style={{ color: textColor }}>
      {/* En-tête */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={24} color="#0062FF" />
            <span>Configuration des Numéros Internationaux</span>
          </h2>
          <p style={{ color: subTextColor, fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Normalisation E.164, détection de pays, gestion des doublons et validation par code OTP.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadStats}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${borderColor}`,
              color: textColor,
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleNormalizeAll}
            disabled={isNormalizing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: isNormalizing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0, 98, 255, 0.3)',
            }}
          >
            <Sparkles size={14} />
            <span>{isNormalizing ? 'Normalisation en cours...' : 'Normaliser en masse (E.164)'}</span>
          </button>
        </div>
      </div>

      {normalizeResult && (
        <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', borderRadius: '12px', color: '#34D399', marginBottom: '20px', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 800, marginBottom: '4px' }}>✓ Normalisation terminée avec succès :</div>
          <div>{normalizeResult.message || 'Numéros mis à jour selon le standard international E.164.'}</div>
        </div>
      )}

      {/* Cartes KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Total Enregistrés</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>{stats?.totalNumbers || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#38BDF8', marginTop: '4px' }}>Utilisateurs, clients, caissiers</div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Format E.164 Valide</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#10B981' }}>{stats?.validFormat || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '4px' }}>{validPercent}% de conformité</div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Numéros Vérifiés (OTP)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#38BDF8' }}>{stats?.verified || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#38BDF8', marginTop: '4px' }}>Preuve de possession confirmée</div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>À Corriger / Incomplets</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: (stats?.needsCorrection || 0) > 0 ? '#EF4444' : '#10B981' }}>
            {stats?.needsCorrection || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: (stats?.needsCorrection || 0) > 0 ? '#EF4444' : '#10B981', marginTop: '4px' }}>
            {(stats?.needsCorrection || 0) > 0 ? 'Format local ou incomplet' : 'Tous conformes'}
          </div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' }}>
          <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Doublons Détectés</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: (stats?.duplicatesCount || 0) > 0 ? '#F59E0B' : '#10B981' }}>
            {stats?.duplicatesCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#F59E0B', marginTop: '4px' }}>Numéros partagés</div>
        </div>
      </div>

      {/* Répartition par Pays */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} color="#0062FF" />
          <span>Répartition Géographique des Numéros</span>
        </h3>

        {(!stats?.countryDistribution || Object.keys(stats.countryDistribution).length === 0) ? (
          <div style={{ padding: '20px', textAlign: 'center', color: subTextColor, fontSize: '0.85rem' }}>
            Aucun numéro enregistré.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {Object.entries(stats.countryDistribution).map(([country, count]) => {
              const flags: Record<string, string> = {
                CM: '🇨🇲 Cameroun',
                CI: "🇨🇮 Côte d'Ivoire",
                SN: '🇸🇳 Sénégal',
                TG: '🇹🇬 Togo',
                BJ: '🇧🇯 Bénin',
                GA: '🇬🇦 Gabon',
                CG: '🇨🇬 Congo',
                CD: '🇨🇩 RDC',
                FR: '🇫🇷 France',
                US: '🇺🇸 USA',
                CA: '🇨🇦 Canada',
              };
              return (
                <div
                  key={country}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {flags[country] || `🌐 ${country}`}
                  </span>
                  <span
                    style={{
                      background: '#0062FF',
                      color: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Échantillon des Numéros Nécessitant une Attention */}
      {(stats?.invalidSamples && stats.invalidSamples.length > 0) && (
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
            <AlertTriangle size={18} />
            <span>Numéros Nécessitant une Correction Manuelle</span>
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}`, textAlign: 'left', color: subTextColor }}>
                  <th style={{ padding: '10px' }}>Table / Entité</th>
                  <th style={{ padding: '10px' }}>Nom / Titre</th>
                  <th style={{ padding: '10px' }}>Numéro Stocké</th>
                  <th style={{ padding: '10px' }}>Diagnostic</th>
                </tr>
              </thead>
              <tbody>
                {stats.invalidSamples.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td style={{ padding: '10px' }}>
                      <code style={{ background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                        {s.table}
                      </code>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{s.name || 'N/A'}</td>
                    <td style={{ padding: '10px', color: '#EF4444', fontWeight: 700 }}>{s.phone}</td>
                    <td style={{ padding: '10px', color: subTextColor, fontSize: '0.75rem' }}>
                      Format incomplet ou indicatif international absent
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
