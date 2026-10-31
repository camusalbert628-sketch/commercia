import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Trash2,
  X,
  Key,
  Mail,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface TeamMember {
  id: string;
  userId: string;
  role: 'owner' | 'manager' | 'employee';
  isActive: boolean;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
}

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({ isOpen, onClose }) => {
  const { user, activeBusinessId } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('owner');
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'manager' | 'employee'>('employee');
  const [password, setPassword] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await api.get<{ members: TeamMember[]; currentUserRole: string }>('/business/members');
      setMembers(data.members || []);
      setCurrentUserRole(data.currentUserRole || 'owner');
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible de charger l\'équipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setShowAddForm(false);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, activeBusinessId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      await api.post('/business/members', {
        firstName,
        lastName,
        email,
        phone,
        role,
        password,
      });

      setSuccessMessage(`Collaborateur ${firstName} ajouté avec succès !`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPassword('123456');
      setShowAddForm(false);
      fetchMembers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de l\'ajout du collaborateur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: TeamMember) => {
    if (member.role === 'owner') return;
    try {
      await api.put(`/business/members/${member.id}`, {
        isActive: !member.isActive,
      });
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour.');
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!window.confirm(`Voulez-vous vraiment retirer ${member.user.firstName} de la boutique ?`)) {
      return;
    }
    try {
      await api.delete(`/business/members/${member.id}`);
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#0062FF',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Gestion d'Équipe & Caissiers
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                Boutique : <strong>{activeBusiness?.name || 'Mon Activité'}</strong> • Rôles et contrôles anti-fraude
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                color: '#991B1B',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '12px 16px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '10px',
                color: '#065F46',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Matrice des droits */}
          <div
            style={{
              padding: '14px 16px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '0.82rem',
              color: '#334155',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '6px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} color="#0062FF" /> Matrice de Sécurité & Rôles :
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '8px' }}>
              <div style={{ padding: '8px 10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontWeight: 700, color: '#D97706' }}>👑 Propriétaire :</span> Accès 100% total (marge bénéficiaire, rapports financiers, trésorerie, multi-boutiques).
              </div>
              <div style={{ padding: '8px 10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontWeight: 700, color: '#0284C7' }}>👔 Gérant :</span> Ventes, achats de stock, gestion des commandes, dépenses d'exploitation.
              </div>
              <div style={{ padding: '8px 10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontWeight: 700, color: '#10B981' }}>🛒 Caissier :</span> Encaissements, calcul monnaie, caisse du jour. <strong style={{ color: '#DC2626' }}>Prix d'achat & marges masqués</strong>.
              </div>
            </div>
          </div>

          {/* Bouton Ajouter */}
          {!showAddForm ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B' }}>
                Collaborateurs enregistrés ({members.length})
              </span>
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#0062FF',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Nouveau Caissier / Collaborateur</span>
              </button>
            </div>
          ) : (
            /* Formulaire d'ajout */
            <form
              onSubmit={handleAddMember}
              style={{
                background: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: '14px',
                padding: '18px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: 800, color: '#15803D', fontSize: '0.95rem' }}>
                  Ajouter un nouveau membre à la boutique
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: Awa, Moussa..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Nom
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Diallo, Ndiaye..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Email (sert d'identifiant de connexion) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="caissier@moncommerce.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Rôle attribué *
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#FFFFFF' }}
                  >
                    <option value="employee">🛒 Caissier / Vendeur (Marges masquées)</option>
                    <option value="manager">👔 Gérant / Manager (Gestion stock & ventes)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Mot de passe / Code PIN de caisse *
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 4 caractères"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 18px', borderRadius: '8px', background: '#16A34A', color: 'white', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Création en cours...' : 'Enregistrer le collaborateur'}
                </button>
              </div>
            </form>
          )}

          {/* Liste des membres */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
              Chargement de l'équipe...
            </div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
              Aucun collaborateur pour cette boutique.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {members.map((m) => {
                const isOwner = m.role === 'owner';
                const isManager = m.role === 'manager';
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: m.isActive ? '#FFFFFF' : '#F8FAFC',
                      border: m.isActive ? '1px solid #E2E8F0' : '1px dashed #CBD5E1',
                      opacity: m.isActive ? 1 : 0.65,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: isOwner ? '#FEF3C7' : isManager ? '#E0F2FE' : '#DCFCE7',
                          color: isOwner ? '#D97706' : isManager ? '#0284C7' : '#16A34A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                        }}
                      >
                        {m.user.firstName ? m.user.firstName[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
                            {m.user.firstName} {m.user.lastName}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              background: isOwner ? '#FEF3C7' : isManager ? '#E0F2FE' : '#DCFCE7',
                              color: isOwner ? '#B45309' : isManager ? '#0369A1' : '#15803D',
                            }}
                          >
                            {isOwner ? '👑 Propriétaire' : isManager ? '👔 Gérant' : '🛒 Caissier'}
                          </span>
                          {!m.isActive && (
                            <span style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700 }}>
                              (Accès Suspendu)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', gap: '12px', marginTop: '2px' }}>
                          <span>{m.user.email}</span>
                          {m.user.phone && <span>• {m.user.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {!isOwner && currentUserRole === 'owner' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleStatus(m)}
                          title={m.isActive ? 'Suspendre l\'accès de ce caissier' : 'Réactiver l\'accès'}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            background: m.isActive ? '#FFFBEB' : '#F0FDF4',
                            color: m.isActive ? '#D97706' : '#16A34A',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {m.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m)}
                          title="Retirer de la boutique"
                          style={{
                            padding: '6px',
                            borderRadius: '8px',
                            border: '1px solid #FCA5A5',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#0F172A',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
