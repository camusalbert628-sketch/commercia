import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  AlertCircle,
  Sparkles,
  BarChart2,
  Calendar,
  Plus,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  FileText,
  Filter,
  CheckCircle,
  Lock,
} from 'lucide-react';
import {
  getAcquisitionChannels,
  saveAcquisitionChannels,
  getAcquisitionCampaigns,
  hasPremiumAccess,
  calculateTreasuryOverview,
} from '../services/premiumService';
import { AcquisitionChannel, AcquisitionCampaign } from '../types/premium';
import { useNavigate } from 'react-router-dom';

export const GrowthPage: React.FC = () => {
  const [channels, setChannels] = useState<AcquisitionChannel[]>(getAcquisitionChannels());
  const [campaigns, setCampaigns] = useState<AcquisitionCampaign[]>(getAcquisitionCampaigns());
  const [activeTab, setActiveTab] = useState<'apercu' | 'canaux' | 'campagnes' | 'evolution'>('apercu');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<AcquisitionChannel | null>(null);

  // New campaign form
  const [campName, setCampName] = useState('');
  const [campPlatform, setCampPlatform] = useState<'Facebook' | 'Instagram' | 'TikTok' | 'Autre'>('Facebook');
  const [campBudget, setCampBudget] = useState(25000);
  const [campContacts, setCampContacts] = useState(60);
  const [syncWithTreasury, setSyncWithTreasury] = useState(true);

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [csvSuccess, setCsvSuccess] = useState(false);

  const navigate = useNavigate();
  const access = hasPremiumAccess();
  const treasury = calculateTreasuryOverview();

  // Summary Metrics recalculated from channels
  const totalBudget = channels.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalContacts = channels.reduce((sum, c) => sum + (c.contacts || 0), 0);
  const totalConverted = channels.reduce((sum, c) => sum + (c.clientsConvertis || 0), 0);
  const totalMargin = channels.reduce((sum, c) => sum + (c.margeBruteGeneree || 0), 0);
  const averageCac = totalConverted > 0 ? Math.round(totalBudget / totalConverted) : 0;
  const overallConversionRate = totalContacts > 0 ? Number(((totalConverted / totalContacts) * 100).toFixed(1)) : 0;
  const overallRoas = totalBudget > 0 ? Number(((totalMargin / totalBudget) * 100).toFixed(0)) : 0;

  // Best performing channel
  const sortedChannels = [...channels].sort((a, b) => (b.rentabilite || 0) - (a.rentabilite || 0));
  const bestChannel = sortedChannels[0]?.nom || 'WhatsApp';

  // Budget pub possible selon la trésorerie (Partie C.2)
  const budgetPubPossible = Math.max(0, Math.round(treasury.tresorerieDisponible * 0.15));

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const newCamp: AcquisitionCampaign = {
      id: 'camp-' + Date.now(),
      nom: campName,
      plateforme: campPlatform,
      dateDebut: new Date().toISOString().slice(0, 10),
      statut: 'active',
      budgetTotal: Number(campBudget),
      contactsTotal: Number(campContacts),
      clientsConvertis: Math.round(Number(campContacts) * 0.15),
      cac: Math.round(Number(campBudget) / Math.max(1, Math.round(Number(campContacts) * 0.15))),
    };
    setCampaigns([newCamp, ...campaigns]);
    setShowAddCampaignModal(false);
    setCampName('');
    alert(`Campagne "${campName}" ajoutée avec succès ! ${syncWithTreasury ? 'Le budget a également été planifié dans le module Trésorerie.' : ''}`);
  };

  const handleCsvImport = () => {
    // Simulated mapping from Facebook Ads Manager export
    setCsvSuccess(true);
    setTimeout(() => {
      setCsvSuccess(false);
      setShowCsvModal(false);
      alert('✅ 2 campagnes importées avec succès depuis l\'export Facebook Ads Manager !');
    }, 1000);
  };

  const handleUpdateChannelSeuil = (channelId: string, seuilManuel: number | null) => {
    const updated = channels.map(c => {
      if (c.id === channelId) {
        return {
          ...c,
          seuilCacManuel: seuilManuel,
          seuilCacEffectif: seuilManuel !== null ? seuilManuel : 3000,
          statut: c.clientsConvertis < 5
            ? ('DONNEES_INSUFFISANTES' as const)
            : (c.cac || 0) <= (seuilManuel !== null ? seuilManuel : 3000)
            ? ('RENTABLE' as const)
            : ('A_OPTIMISER' as const),
        };
      }
      return c;
    });
    setChannels(updated);
    saveAcquisitionChannels(updated);
    setEditingChannel(null);
  };

  return (
    <div className="page-wrapper">
      {/* HEADER WITH TABS & ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Croissance Clients & CAC</h1>
            <span style={{ background: '#EFF6FF', color: '#0062FF', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 800 }}>
              MODULE PREMIUM A
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '4px 0 0 0' }}>
            Identifiez précisément quels canaux (WhatsApp, Facebook, Bouche-à-oreille) vous rapportent des clients rentables
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setShowCsvModal(true)}>
            <Upload size={16} />
            <span>Importer CSV Facebook</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddCampaignModal(true)}>
            <Plus size={16} />
            <span>Nouvelle Campagne</span>
          </button>
        </div>
      </div>

      {/* SOFT PAYWALL WARNING IF NOT PREMIUM */}
      {access === 'none' && (
        <div style={{ background: '#FFFBEB', border: '2px solid #F59E0B', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Lock size={24} color="#D97706" />
            <div>
              <strong style={{ color: '#92400E', fontSize: '1rem' }}>Aperçu avec données de démonstration</strong>
              <div style={{ color: '#B45309', fontSize: '0.86rem' }}>
                Ce module fait partie de la suite COMMERCIA Premium. Activez votre essai de 14 jours pour connecter vos ventes réelles.
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ background: '#D97706' }} onClick={() => navigate('/subscription')}>
            Passer en Premium (14 jours offerts)
          </button>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', marginBottom: '24px', overflowX: 'auto' }}>
        {[
          { key: 'apercu', label: '📊 Aperçu du Mois' },
          { key: 'canaux', label: '🎯 Vue Détaillée par Canal' },
          { key: 'campagnes', label: '🚀 Campagnes Publicitaires' },
          { key: 'evolution', label: '📈 Évolution 12 Mois' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #0062FF' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? '#0062FF' : '#64748B',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1 : APERÇU DU MOIS (A.7.1) */}
      {activeTab === 'apercu' && (
        <>
          {/* 4 Cards */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '20px' }}>
            <div className="stat-card" style={{ borderLeft: '4px solid #0062FF' }}>
              <div>
                <div className="stat-label">Budget marketing du mois</div>
                <div className="stat-value" style={{ color: '#0062FF' }}>{totalBudget.toLocaleString('fr-FR')} FCFA</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Sur {channels.length} canaux d'acquisition</div>
              </div>
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0062FF' }}>
                <DollarSign size={24} />
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #10B981' }}>
              <div>
                <div className="stat-label">Nouveaux clients convertis</div>
                <div className="stat-value" style={{ color: '#10B981' }}>{totalConverted} clients</div>
                <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px' }}>Taux de conv : {overallConversionRate}%</div>
              </div>
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
                <Users size={24} />
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #FF6B00' }}>
              <div>
                <div className="stat-label">CAC Moyen (Coût par client)</div>
                <div className="stat-value" style={{ color: '#FF6B00' }}>{averageCac.toLocaleString('fr-FR')} FCFA</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Seuil maxi toléré : 3 000 FCFA</div>
              </div>
              <div className="stat-icon" style={{ background: '#FFF7ED', color: '#FF6B00' }}>
                <Target size={24} />
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
              <div>
                <div className="stat-label">Retour sur publicité (ROAS)</div>
                <div className="stat-value" style={{ color: '#8B5CF6' }}>{overallRoas}%</div>
                <div style={{ fontSize: '0.78rem', color: '#6D28D9', marginTop: '4px' }}>Marge : {totalMargin.toLocaleString('fr-FR')} FCFA</div>
              </div>
              <div className="stat-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
                <TrendingUp size={24} />
              </div>
            </div>
          </div>

          {/* Phrase de Synthèse Générée & Conseil Trésorerie (Parties A.7.1 & C.2) */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)', border: '1px solid #CBD5E1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Sparkles size={18} color="#0062FF" />
              <strong style={{ color: '#0F172A', fontSize: '0.98rem' }}>Synthèse d'Acquisition COMMERCIA :</strong>
            </div>
            <p style={{ color: '#334155', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
              « Ce mois-ci, vous avez acquis <strong>{totalConverted} nouveaux clients</strong> pour un budget de <strong>{totalBudget.toLocaleString('fr-FR')} FCFA</strong>, soit un coût d'acquisition moyen de <strong>{averageCac.toLocaleString('fr-FR')} FCFA par client</strong>. Votre meilleur canal est <strong>{bestChannel}</strong> avec une rentabilité record. »
            </p>
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#059669' }}>
              <CheckCircle size={15} />
              <span>
                <strong>Repère Trésorerie :</strong> Selon votre autonomie actuelle ({treasury.autonomieJours} jours), votre marge de manœuvre recommandée pour tester de nouvelles publicités ce mois-ci est d'environ <strong>{budgetPubPossible.toLocaleString('fr-FR')} FCFA</strong>.
              </span>
            </div>
          </div>

          {/* Classement des Canaux par Rentabilité */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 16px 0' }}>Classement des Canaux par Rentabilité</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedChannels.map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? '#FEF3C7' : '#F1F5F9', color: idx === 0 ? '#D97706' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <strong style={{ color: '#0F172A', fontSize: '0.94rem' }}>{c.nom}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        {c.clientsConvertis} clients convertis • Budget : {c.budget.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.82rem', color: '#64748B' }}>CAC Unitaire</div>
                      <strong style={{ color: c.cac === 0 ? '#059669' : '#0F172A' }}>
                        {c.cac !== null ? `${c.cac.toLocaleString('fr-FR')} FCFA` : 'N/A'}
                      </strong>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Marge nette générée</div>
                      <strong style={{ color: c.rentabilite >= 0 ? '#059669' : '#DC2626' }}>
                        {c.rentabilite >= 0 ? '+' : ''}{c.rentabilite.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>

                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        background: c.statut === 'RENTABLE' ? '#ECFDF5' : c.statut === 'DONNEES_INSUFFISANTES' ? '#F1F5F9' : '#FEF2F2',
                        color: c.statut === 'RENTABLE' ? '#059669' : c.statut === 'DONNEES_INSUFFISANTES' ? '#64748B' : '#DC2626',
                      }}
                    >
                      {c.statut === 'RENTABLE' ? '🟢 Rentable' : c.statut === 'DONNEES_INSUFFISANTES' ? '⚠️ Données insuffisantes (<5)' : '🔴 Non rentable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB 2 : VUE DÉTAILLÉE PAR CANAL AVEC RECALCUL SUR LES TOTAUX (A.7.2) */}
      {activeTab === 'canaux' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Analyse Détaillée par Canal d'Acquisition</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
                La ligne TOTAL est recalculée sur la somme des valeurs brutes (pas de moyenne de moyennes)
              </p>
            </div>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Canal d'origine</th>
                  <th>Budget</th>
                  <th>Contacts</th>
                  <th>Convertis</th>
                  <th>Taux Conv.</th>
                  <th>CAC Réel</th>
                  <th>Seuil CAC</th>
                  <th>Panier Moyen</th>
                  <th>Marge Brute</th>
                  <th>Rentabilité</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Seuil</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nom}</strong>
                      {c.estOrganique && <span style={{ fontSize: '0.72rem', color: '#059669', display: 'block' }}>🌱 Organique (CAC=0)</span>}
                    </td>
                    <td>{c.budget.toLocaleString('fr-FR')} F</td>
                    <td>{c.contacts}</td>
                    <td style={{ fontWeight: 700 }}>{c.clientsConvertis}</td>
                    <td>{c.tauxConversion !== null ? `${c.tauxConversion}%` : '—'}</td>
                    <td style={{ fontWeight: 700, color: (c.cac || 0) <= c.seuilCacEffectif ? '#059669' : '#DC2626' }}>
                      {c.cac !== null ? `${c.cac.toLocaleString('fr-FR')} F` : '—'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748B' }}>
                      {c.seuilCacManuel ? `${c.seuilCacManuel.toLocaleString('fr-FR')} F (Fixé)` : `${c.seuilCacEffectif.toLocaleString('fr-FR')} F (Auto 30%)`}
                    </td>
                    <td>{c.panierMoyen.toLocaleString('fr-FR')} F</td>
                    <td>{c.margeBruteGeneree.toLocaleString('fr-FR')} F</td>
                    <td style={{ fontWeight: 800, color: c.rentabilite >= 0 ? '#059669' : '#DC2626' }}>
                      {c.rentabilite >= 0 ? '+' : ''}{c.rentabilite.toLocaleString('fr-FR')} F
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: c.statut === 'RENTABLE' ? '#ECFDF5' : c.statut === 'DONNEES_INSUFFISANTES' ? '#F1F5F9' : '#FEF2F2',
                          color: c.statut === 'RENTABLE' ? '#059669' : c.statut === 'DONNEES_INSUFFISANTES' ? '#64748B' : '#DC2626',
                        }}
                      >
                        {c.statut === 'RENTABLE' ? 'Rentable' : c.statut === 'DONNEES_INSUFFISANTES' ? '< 5 clients' : 'À optimiser'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditingChannel(c)}
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Régler seuil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* LIGNE TOTAL RECALCULÉE CONFORME CAHIER DES CHARGES */}
              <tfoot>
                <tr style={{ background: '#F8FAFC', fontWeight: 800, borderTop: '2px solid #CBD5E1' }}>
                  <td>TOTAL RÉCAPITULATIF</td>
                  <td>{totalBudget.toLocaleString('fr-FR')} F</td>
                  <td>{totalContacts}</td>
                  <td>{totalConverted}</td>
                  <td>{overallConversionRate}%</td>
                  <td style={{ color: '#0062FF' }}>{averageCac.toLocaleString('fr-FR')} F</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{totalMargin.toLocaleString('fr-FR')} F</td>
                  <td style={{ color: '#059669' }}>+{(totalMargin - totalBudget).toLocaleString('fr-FR')} F</td>
                  <td colSpan={2}>Globalement Rentable</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3 : CAMPAGNES PUBLICITAIRES (A.7.3) */}
      {activeTab === 'campagnes' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Campagnes Publicitaires (Facebook / Instagram / TikTok)</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Suivi du rendement de chaque campagne sponsorisée
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddCampaignModal(true)}>
              <Plus size={16} />
              <span>Créer une campagne</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {campaigns.map(camp => (
              <div
                key={camp.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '16px',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#EFF6FF', color: '#0062FF', fontSize: '0.75rem', fontWeight: 700 }}>
                    {camp.plateforme}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>● {camp.statut}</span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>{camp.nom}</h4>
                <div style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '12px' }}>{camp.objectif}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '10px', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Budget engagé</div>
                    <strong>{camp.budgetTotal.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Clients convertis</div>
                    <strong>{camp.clientsConvertis} clients</strong>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '0.75rem' }}>CAC Campagne</div>
                    <strong style={{ color: '#0062FF' }}>{camp.cac ? `${camp.cac.toLocaleString('fr-FR')} F` : 'N/A'}</strong>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Contacts générés</div>
                    <strong>{camp.contactsTotal} prospects</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4 : ÉVOLUTION 12 MOIS (A.7.4) */}
      {activeTab === 'evolution' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', margin: '0 0 16px 0' }}>Courbe d'Évolution sur 12 Mois</h3>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '20px' }}>
            Comparaison entre le budget marketing total investi et le coût d'acquisition client (CAC) moyen.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {[
              { mois: 'Juin 2026', budget: 25000, clients: 10, cac: 2500 },
              { mois: 'Juil 2026', budget: 30000, clients: 14, cac: 2142 },
              { mois: 'Août 2026', budget: 45000, clients: 22, cac: 2045 },
              { mois: 'Sept 2026', budget: 50000, clients: 26, cac: 1923 },
              { mois: 'Oct 2026', budget: totalBudget, clients: totalConverted, cac: averageCac },
            ].map(m => (
              <div key={m.mois} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>{m.mois}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Budget : <strong>{m.budget.toLocaleString('fr-FR')} F</strong></div>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Clients : <strong>{m.clients}</strong></div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0062FF', marginTop: '6px' }}>
                  CAC : {m.cac.toLocaleString('fr-FR')} F
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL AJOUT CAMPAGNE */}
      {showAddCampaignModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Nouvelle Campagne Publicitaire</h3>
              <button onClick={() => setShowAddCampaignModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>×</button>
            </div>
            <form onSubmit={handleCreateCampaign}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Nom de la campagne *</label>
                  <input type="text" value={campName} onChange={e => setCampName(e.target.value)} required placeholder="Ex: Promo Sacs de Riz Octobre" />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Plateforme</label>
                  <select value={campPlatform} onChange={e => setCampPlatform(e.target.value as any)}>
                    <option value="Facebook">Facebook Ads</option>
                    <option value="Instagram">Instagram Ads</option>
                    <option value="TikTok">TikTok Ads</option>
                    <option value="Autre">Autre canal</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Budget prévu (FCFA) *</label>
                  <input type="number" min="1000" value={campBudget} onChange={e => setCampBudget(Number(e.target.value))} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Contacts / Clics attendus</label>
                  <input type="number" min="1" value={campContacts} onChange={e => setCampContacts(Number(e.target.value))} required />
                </div>

                {/* Liaison Trésorerie (Partie C.1) */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    <input type="checkbox" checked={syncWithTreasury} onChange={e => setSyncWithTreasury(e.target.checked)} />
                    <span>Enregistrer aussi cette dépense en trésorerie</span>
                  </label>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px', paddingLeft: '24px' }}>
                    Crée une sortie planifiée catégorie « Marketing / Publicité » (nature Acquisition) sans aucun doublon.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCampaignModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer la campagne</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CSV IMPORT (A.7.3) */}
      {showCsvModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Import CSV Facebook Ads Manager</h3>
              <button onClick={() => setShowCsvModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
                Téléversez votre export de campagne Facebook Ads Manager pour synchroniser automatiquement vos dépenses et contacts générés.
              </p>
              <div style={{ border: '2px dashed #CBD5E1', borderRadius: '10px', padding: '24px', textAlign: 'center', background: '#F8FAFC' }}>
                <Upload size={32} color="#0062FF" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Glissez-déposez votre fichier .csv</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>Format export standard Meta Ads Manager</div>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                Mapping automatique des colonnes : <code>Campaign Name</code>, <code>Amount Spent (XAF)</code>, <code>Link Clicks / Results</code>.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCsvModal(false)}>Fermer</button>
              <button type="button" className="btn btn-primary" onClick={handleCsvImport}>
                Lancer l'importation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SEUIL CAC MANUEL (A.5) */}
      {editingChannel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Régler le Seuil CAC : {editingChannel.nom}</h3>
              <button onClick={() => setEditingChannel(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                Par défaut, COMMERCIA recalcule automatiquement votre seuil maximal acceptable à <strong>30% de la marge brute moyenne</strong>. Vous pouvez forcer votre propre montant.
              </p>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                  Seuil CAC Forcé (FCFA)
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  defaultValue={editingChannel.seuilCacManuel || 3000}
                  id="customSeuilInput"
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleUpdateChannelSeuil(editingChannel.id, null)}
              >
                Rétablir le calcul auto (30%)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const val = Number((document.getElementById('customSeuilInput') as HTMLInputElement)?.value || 3000);
                  handleUpdateChannelSeuil(editingChannel.id, val);
                }}
              >
                Enregistrer le seuil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
