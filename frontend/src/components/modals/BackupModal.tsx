import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  X,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Sparkles,
  ArrowRight,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  exportFullCommerceBackup,
  importCommerceBackup,
  inspectBackupFile,
  getCommerceStatsSummary,
  CommerceStatsSummary,
  BackupInspectionResult,
} from '../../utils/backupService';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<CommerceStatsSummary>(getCommerceStatsSummary());
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [inspection, setInspection] = useState<BackupInspectionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStats(getCommerceStatsSummary());
      setBackupMessage(null);
      setSelectedFileContent(null);
      setSelectedFileName(null);
      setInspection(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      setIsExporting(true);
      setBackupMessage(null);
      exportFullCommerceBackup();
      setStats(getCommerceStatsSummary());
      setBackupMessage({
        type: 'success',
        text: 'Fichier de sauvegarde exporté avec succès ! Gardez ce fichier en lieu sûr (WhatsApp ou Google Drive).',
      });
    } catch (err: any) {
      setBackupMessage({
        type: 'error',
        text: err.message || 'Erreur lors du téléchargement de la sauvegarde.',
      });
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setBackupMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setSelectedFileContent(content);
        const result = inspectBackupFile(content);
        setInspection(result);
        if (!result.isValid) {
          setBackupMessage({
            type: 'error',
            text: result.error || 'Le fichier sélectionné n\'est pas un fichier de sauvegarde COMMERCIA valide.',
          });
        }
      } catch (err: any) {
        setBackupMessage({
          type: 'error',
          text: 'Impossible de lire le fichier (' + (err.message || '') + ')',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!selectedFileContent) return;

    try {
      setIsImporting(true);
      setBackupMessage(null);
      importCommerceBackup(selectedFileContent);
      setBackupMessage({
        type: 'success',
        text: 'Données restaurées avec succès ! Rechargement de votre application en cours...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1400);
    } catch (err: any) {
      setIsImporting(false);
      setBackupMessage({
        type: 'error',
        text: err.message || 'Erreur lors de la restauration du fichier.',
      });
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          width: '95%',
          maxHeight: '92vh',
          borderRadius: '20px',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.12)',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Sauvegarde & Restauration
                </h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: '#ECFDF5',
                    color: '#065F46',
                  }}
                >
                  100% Sécurisé
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                Ne perdez jamais vos ventes, stocks, caisses et clients
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              color: '#64748B',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Status Message */}
          {backupMessage && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: backupMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                border: `1.5px solid ${backupMessage.type === 'success' ? '#A7F3D0' : '#FECDD3'}`,
                color: backupMessage.type === 'success' ? '#065F46' : '#991B1B',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: 'modalPop 0.2s ease',
              }}
            >
              {backupMessage.type === 'success' ? (
                <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
              )}
              <span>{backupMessage.text}</span>
            </div>
          )}

          {/* Business Live Health Summary */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Données prêtes pour sauvegarde ({stats.businessName})
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                {stats.lastBackupDate ? `Dernière sauvegarde : ${stats.lastBackupDate}` : 'Aucun export récent'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>{stats.productsCount}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Articles stock</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>{stats.salesCount}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Ventes</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#DC2626' }}>{stats.expensesCount}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Dépenses</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0062FF' }}>{stats.customersCount}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Clients</div>
              </div>
            </div>
          </div>

          {/* OPTION 1 : EXPORTER / TELECHARGER */}
          <div
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%)',
              border: '1.5px solid #BBF7D0',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#DCFCE7',
                    color: '#15803D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Download size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                    Exporter une Sauvegarde Complète
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Télécharge un fichier <strong>.JSON</strong> autonome avec 100% de vos données
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: isExporting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {isExporting ? (
                <>
                  <RefreshCw size={18} className="spin" />
                  <span>Génération du fichier...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Télécharger ma sauvegarde complète (JSON)</span>
                </>
              )}
            </button>
          </div>

          {/* SEPARATOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
              OU RESTAURATION
            </span>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          </div>

          {/* OPTION 2 : RESTAURER DEPUIS UN FICHIER */}
          <div
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
              border: '1.5px solid #CBD5E1',
              borderRadius: '16px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#EFF6FF',
                  color: '#1D4ED8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                  Restaurer depuis un Fichier de Sauvegarde
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  Transférez vos données sur ce nouvel appareil ou récupérez un état antérieur
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {!inspection || !inspection.isValid ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  color: '#1E293B',
                  border: '1.5px dashed #94A3B8',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Upload size={16} color="#0062FF" />
                <span>Sélectionner mon fichier .JSON sur cet appareil</span>
              </button>
            ) : (
              /* Pre-Restoration Inspection Card */
              <div
                style={{
                  background: '#EFF6FF',
                  border: '1.5px solid #BFDBFE',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  animation: 'modalPop 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#1E40AF' }}>
                    <FileCheck2 size={16} color="#2563EB" />
                    <span>Fichier de sauvegarde prêt pour importation</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInspection(null);
                      setSelectedFileContent(null);
                      setSelectedFileName(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748B',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Changer de fichier
                  </button>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#334155', background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #DBEAFE' }}>
                  <div><strong>Fichier :</strong> {selectedFileName}</div>
                  <div><strong>Établissement :</strong> {inspection.businessName}</div>
                  <div><strong>Horodatage :</strong> {inspection.exportedAt}</div>
                  <div style={{ marginTop: '4px', color: '#059669', fontWeight: 700 }}>
                    Contenu : {inspection.summary?.products} articles • {inspection.summary?.sales} ventes • {inspection.summary?.expenses} dépenses • {inspection.summary?.customers} clients
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    disabled={isImporting}
                    style={{
                      flex: 1,
                      height: '42px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: isImporting ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0, 98, 255, 0.25)',
                    }}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        <span>Restauration des données...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Confirmer & Restaurer toutes mes données</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Security & Best Practices Advice */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              fontSize: '0.76rem',
              color: '#92400E',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>💡</span>
            <span>
              <strong>Conseil Sécurité COMMERCIA :</strong> Téléchargez une sauvegarde à chaque clôture de caisse ou fin de semaine et partagez-la sur votre WhatsApp privé ou par e-mail. En cas de perte ou de panne de votre smartphone/PC, vous retrouverez toutes vos données en 1 clic.
            </span>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '12px 24px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              height: '38px',
              padding: '0 20px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
