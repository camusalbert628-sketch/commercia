import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Eye,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../services/api';

interface MerchantsDirectoryViewProps {
  adminTheme: 'light' | 'dark';
  onSelectUser: (userId: string) => void;
  onOpenCreateModal: () => void;
}

export const MerchantsDirectoryView: React.FC<MerchantsDirectoryViewProps> = ({
  adminTheme,
  onSelectUser,
  onOpenCreateModal,
}) => {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtres & Recherche
  const [search, setSearch] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const loadMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (planFilter !== 'all') params.append('plan', planFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sectorFilter !== 'all') params.append('sector', sectorFilter);
      if (sortBy) params.append('sort', sortBy);
      params.append('page', page.toString());
      params.append('limit', '20');

      const res = await api.get<any>(`/admin/merchants?${params.toString()}`);
      setMerchants(res.merchants || []);
      setSummary(res.summary || null);
      setTotalRecords(res.totalRecords || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('Erreur chargement marchands:', err);
    } finally {
      setLoading(false);
    }
  }, [search, planFilter, statusFilter, sectorFilter, sortBy, page]);

  useEffect(() => {
    loadMerchants();
  }, [loadMerchants]);

  // Export CSV
  const handleExportCsv = () => {
    if (merchants.length === 0) return;

    const headers = [
      'Identifiant',
      'Nom',
      'Telephone',
      'Email',
      'Entreprise',
      'Secteur',
      'Date_Inscription',
      'Formule',
      'Date_Souscription',
      'Date_Expiration',
      'Dernier_Paiement_Montant',
      'Dernier_Paiement_Date',
      'Prochain_Renouvellement',
      'Total_Paye_Brut',
      'Revenu_Net_Encaisse',
      'Statut',
      'Derniere_Activite',
    ];

    const rows = merchants.map((m) => [
      `"${m.id}"`,
      `"${m.name}"`,
      `"${m.phone}"`,
      `"${m.email}"`,
      `"${m.businessName}"`,
      `"${m.sector}"`,
      `"${m.createdAt.slice(0, 10)}"`,
      `"${m.planName}"`,
      `"${m.subStart ? m.subStart.slice(0, 10) : ''}"`,
      `"${m.subEnd ? m.subEnd.slice(0, 10) : ''}"`,
      m.lastPayment?.amount || 0,
      `"${m.lastPayment?.date ? m.lastPayment.date.slice(0, 10) : ''}"`,
      `"${m.nextRenewal ? m.nextRenewal.slice(0, 10) : ''}"`,
      m.totalPaid,
      m.netRevenue,
      `"${m.status}"`,
      `"${m.lastActivity ? m.lastActivity.slice(0, 10) : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `COMMERCIA_Marchands_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLight = adminTheme === 'light';
  const cardBg = isLight ? '#FFFFFF' : '#0F172A';
  const borderCol = isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1E293B' : '#F8FAFC';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';

  return (
    <div>
      {/* EN-TÊTE DE LA SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} color="#2563EB" />
            Utilisateurs & Marchands — Centre de Pilotage 360°
          </h2>
          <p style={{ color: textSecondary, fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Contrôle individuel, rentabilité réelle, statuts automatisés et cycle de vie complet de chaque commerçant.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportCsv}
            disabled={merchants.length === 0}
            style={{
              background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${borderCol}`,
              color: textPrimary,
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileSpreadsheet size={15} color="#10B981" />
            Exporter CSV / Excel
          </button>

          <button
            onClick={onOpenCreateModal}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
            }}
          >
            <Plus size={16} />
            Créer un Marchand
          </button>
        </div>
      </div>

      {/* CARTES KPI RÉSUMÉES (MODULE 2 DU CDC) */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '22px' }}>
          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>TOTAL INSCRITS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: textPrimary, marginTop: '4px' }}>{summary.totalUsers}</div>
            <div style={{ fontSize: '11.5px', color: '#2563EB', marginTop: '2px' }}>{summary.payingUsers} payants (Pro/Biz)</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>ABONNEMENTS ACTIFS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{summary.activePaid}</div>
            <div style={{ fontSize: '11.5px', color: textSecondary, marginTop: '2px' }}>{summary.freeUsers} formule gratuite</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>À RENOUVELER / EN GRÂCE</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>{summary.expiringSoon + summary.inGrace}</div>
            <div style={{ fontSize: '11.5px', color: textSecondary, marginTop: '2px' }}>{summary.inGrace} en période de grâce</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>NON RENOUVELÉS / EXPIRÉS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#E11D48', marginTop: '4px' }}>{summary.expiredCount}</div>
            <div style={{ fontSize: '11.5px', color: textSecondary, marginTop: '2px' }}>Sans renouvellement</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>COMPTES SUSPENDUS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>{summary.suspendedCount}</div>
            <div style={{ fontSize: '11.5px', color: textSecondary, marginTop: '2px' }}>{summary.securityLockedCount} bloqué(s) sécurité</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>REVENU NET ENCAISSÉ</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#2563EB', marginTop: '4px' }}>
              {summary.totalNetRevenue.toLocaleString()} <span style={{ fontSize: '13px' }}>XAF</span>
            </div>
            <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>
              CA Brut : {summary.totalGrossRevenue.toLocaleString()} XAF
            </div>
          </div>
        </div>
      )}

      {/* BARRE D'OUTILS : RECHERCHE MULTICRITÈRES, FILTRES & TRI */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderCol}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: textSecondary }} />
          <input
            type="text"
            placeholder="Recherche par nom, email, téléphone, boutique ou ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)',
              color: textPrimary,
              fontSize: '12.5px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filtre Formule */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              background: isLight ? '#FFFFFF' : '#0B1120',
              color: textPrimary,
              fontSize: '12.5px',
              outline: 'none',
            }}
          >
            <option value="all">Toutes formules</option>
            <option value="pro">Formule Pro</option>
            <option value="business">Formule Business</option>
            <option value="free">Formule Gratuite</option>
          </select>

          {/* Filtre Statut (11 Statuts) */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              background: isLight ? '#FFFFFF' : '#0B1120',
              color: textPrimary,
              fontSize: '12.5px',
              outline: 'none',
            }}
          >
            <option value="all">Tous les statuts (11)</option>
            <option value="ACTIF">ACTIF</option>
            <option value="ESSAI">ESSAI</option>
            <option value="EN ATTENTE DE PAIEMENT">EN ATTENTE DE PAIEMENT</option>
            <option value="À RENOUVELER">À RENOUVELER</option>
            <option value="NON RENOUVELÉ">NON RENOUVELÉ</option>
            <option value="EN GRÂCE">EN GRÂCE</option>
            <option value="SUSPENDU AUTOMATIQUEMENT">SUSPENDU AUTOMATIQUEMENT</option>
            <option value="SUSPENDU MANUELLEMENT">SUSPENDU MANUELLEMENT</option>
            <option value="RÉSILIÉ">RÉSILIÉ</option>
            <option value="BLOQUÉ POUR RAISON DE SÉCURITÉ">BLOQUÉ SÉCURITÉ</option>
            <option value="COMPTE GRATUIT">COMPTE GRATUIT</option>
          </select>

          {/* Tri */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              background: isLight ? '#FFFFFF' : '#0B1120',
              color: textPrimary,
              fontSize: '12.5px',
              outline: 'none',
            }}
          >
            <option value="date_desc">Tri : Inscription récente</option>
            <option value="date_asc">Tri : Inscription ancienne</option>
            <option value="revenue_desc">Tri : Revenu net décroissant</option>
            <option value="profit_desc">Tri : Contribution financière</option>
            <option value="expiry_asc">Tri : Échéance la plus proche</option>
            <option value="name_asc">Tri : Nom A-Z</option>
          </select>

          <button
            onClick={() => loadMerchants()}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
              color: textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TABLEAU GÉNÉRAL DES 15 COLONNES OFFICIELLES (MODULE 2.1) */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderCol}`,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
            <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px' }} />
            Chargement des marchands depuis PostgreSQL...
          </div>
        ) : merchants.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
            Aucun utilisateur ne correspond aux critères sélectionnés.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '1300px' }}>
              <thead style={{ background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)' }}>
                <tr style={{ borderBottom: `1px solid ${borderCol}`, color: textSecondary }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Identifiant</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Nom</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Téléphone</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Email</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Entreprise</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Secteur</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Inscription</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Formule</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Souscription</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Expiration</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Dernier Paiement</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Prochain Renouv.</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Montant Payé</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Statut</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Dernière Activité</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => onSelectUser(m.id)}
                    style={{
                      borderBottom: `1px solid ${borderCol}`,
                      cursor: 'pointer',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* 1. Identifiant */}
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: textSecondary }}>
                      {m.id.slice(0, 8)}...
                    </td>

                    {/* 2. Nom */}
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: textPrimary }}>
                      {m.name}
                    </td>

                    {/* 3. Téléphone */}
                    <td style={{ padding: '12px 14px', color: textSecondary }}>
                      {m.phone}
                    </td>

                    {/* 4. Email */}
                    <td style={{ padding: '12px 14px', color: '#2563EB', fontWeight: 600 }}>
                      {m.email}
                    </td>

                    {/* 5. Entreprise */}
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: textPrimary }}>
                      {m.businessName}
                    </td>

                    {/* 6. Secteur */}
                    <td style={{ padding: '12px 14px', color: textSecondary, textTransform: 'capitalize' }}>
                      {m.sector}
                    </td>

                    {/* 7. Date d'inscription */}
                    <td style={{ padding: '12px 14px', color: textSecondary }}>
                      {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                    </td>

                    {/* 8. Formule */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        background: m.planKey === 'business' ? '#7C3AED' : m.planKey === 'pro' ? '#2563EB' : '#64748B',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}>
                        {m.planName}
                      </span>
                    </td>

                    {/* 9. Date de souscription */}
                    <td style={{ padding: '12px 14px', color: textSecondary }}>
                      {new Date(m.subStart).toLocaleDateString('fr-FR')}
                    </td>

                    {/* 10. Date d'expiration */}
                    <td style={{ padding: '12px 14px', color: m.daysRemaining !== null && m.daysRemaining <= 3 ? '#EF4444' : textSecondary, fontWeight: m.daysRemaining !== null && m.daysRemaining <= 3 ? 700 : 500 }}>
                      {m.subEnd ? new Date(m.subEnd).toLocaleDateString('fr-FR') : '—'}
                      {m.daysRemaining !== null && (
                        <div style={{ fontSize: '10.5px', color: m.daysRemaining <= 0 ? '#DC2626' : textSecondary }}>
                          ({m.daysRemaining > 0 ? `${m.daysRemaining}j restants` : 'Expiré'})
                        </div>
                      )}
                    </td>

                    {/* 11. Dernier paiement */}
                    <td style={{ padding: '12px 14px' }}>
                      {m.lastPayment ? (
                        <div>
                          <strong style={{ color: textPrimary }}>{m.lastPayment.amount.toLocaleString()} XAF</strong>
                          <div style={{ fontSize: '10.5px', color: textSecondary }}>
                            {new Date(m.lastPayment.date).toLocaleDateString('fr-FR')} ({m.lastPayment.provider})
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: textSecondary }}>Aucun</span>
                      )}
                    </td>

                    {/* 12. Prochain renouvellement */}
                    <td style={{ padding: '12px 14px', color: textSecondary }}>
                      {m.nextRenewal ? new Date(m.nextRenewal).toLocaleDateString('fr-FR') : '—'}
                    </td>

                    {/* 13. Montant payé */}
                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ color: textPrimary }}>{m.totalPaid.toLocaleString()} XAF</strong>
                      <div style={{ fontSize: '10.5px', color: '#10B981' }}>Net: {m.netRevenue.toLocaleString()} XAF</div>
                    </td>

                    {/* 14. Statut */}
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        title={m.statusDescription}
                        style={{
                          background: m.statusColor,
                          color: '#FFFFFF',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                      >
                        {m.status}
                      </span>
                    </td>

                    {/* 15. Dernière activité */}
                    <td style={{ padding: '12px 14px', color: textSecondary }}>
                      {new Date(m.lastActivity).toLocaleDateString('fr-FR')}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectUser(m.id);
                        }}
                        style={{
                          background: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Eye size={12} />
                        Fiche 360°
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${borderCol}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
          fontSize: '12.5px',
        }}>
          <div style={{ color: textSecondary }}>
            Affichage de <strong>{merchants.length}</strong> sur <strong>{totalRecords}</strong> marchand(s)
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                background: isLight ? '#FFFFFF' : '#0B1120',
                border: `1px solid ${borderCol}`,
                color: page <= 1 ? textSecondary : textPrimary,
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              Précédent
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: textSecondary }}>
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                background: isLight ? '#FFFFFF' : '#0B1120',
                border: `1px solid ${borderCol}`,
                color: page >= totalPages ? textSecondary : textPrimary,
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
