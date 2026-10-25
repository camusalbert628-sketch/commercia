import React from 'react';
import { X, Printer, Share2, CheckCircle2 } from 'lucide-react';
import { Sale } from '../../types';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onNewSale?: () => void;
  businessName?: string;
  currency?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
  onNewSale,
  businessName = 'COMMERCIA',
  currency = 'FCFA',
}) => {
  if (!isOpen || !sale) return null;

  const saleDateFormatted = new Date(sale.saleDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const saleTimeFormatted = new Date(sale.saleDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const paymentMethodLabel =
    sale.paymentMethod === 'mobile_money'
      ? 'Mobile Money (Orange / MTN)'
      : sale.paymentMethod === 'credit'
      ? 'À Crédit (En attente)'
      : sale.paymentMethod === 'bank_transfer'
      ? 'Virement Bancaire'
      : 'Espèces (Cash)';

  // Build WhatsApp text
  const generateWhatsAppMessage = () => {
    let msg = `*REÇU DE VENTE — ${businessName}*\n`;
    msg += `📅 Date : ${saleDateFormatted} à ${saleTimeFormatted}\n`;
    msg += `🧾 Reçu N° : #${sale.id.slice(0, 8).toUpperCase()}\n`;
    if (sale.customer?.name) {
      msg += `👤 Client : ${sale.customer.name}\n`;
    }
    msg += `--------------------------------\n`;
    msg += `*ARTICLES :*\n`;
    sale.items.forEach((item) => {
      msg += `• ${item.quantity}x ${item.name} : ${(item.quantity * item.unitPrice).toLocaleString('fr-FR')} ${currency}\n`;
    });
    msg += `--------------------------------\n`;
    msg += `*TOTAL : ${sale.totalAmount.toLocaleString('fr-FR')} ${currency}*\n`;
    msg += `💳 Règlement : ${paymentMethodLabel}\n`;
    if (sale.paymentMethod === 'credit') {
      msg += `⚠️ Statut : Reste à payer\n`;
    } else {
      msg += `✅ Statut : Payé intégralement\n`;
    }
    msg += `\n_Merci pour votre confiance !_ ✨\n_Généré par COMMERCIA_`;
    return encodeURIComponent(msg);
  };

  const handleShareWhatsApp = () => {
    const phone = sale.customer?.phone?.replace(/\D/g, '') || '';
    const text = generateWhatsAppMessage();
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px', padding: 0, overflow: 'hidden' }}>
        {/* Success header if coming from new sale */}
        <div
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            color: '#FFFFFF',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={24} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Vente validée avec succès !</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Reçu prêt à être remis au client</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div
          id="printable-receipt"
          style={{
            padding: '24px 20px',
            background: '#FFFFFF',
            fontFamily: 'monospace, sans-serif',
            color: '#1E293B',
          }}
        >
          {/* Ticket Header */}
          <div style={{ textAlign: 'center', paddingBottom: '14px', borderBottom: '1px dashed #CBD5E1' }}>
            <img
              src="/commercia-logo.png"
              alt="COMMERCIA"
              style={{
                width: '42px',
                height: '42px',
                objectFit: 'contain',
                margin: '0 auto 6px',
                display: 'block',
              }}
            />
            <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.5px', color: '#08162B' }}>
              {businessName.toUpperCase()}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
              Reçu #{sale.id.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              {saleDateFormatted} à {saleTimeFormatted}
            </div>
            {sale.customer && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  background: '#F1F5F9',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  display: 'inline-block',
                  fontWeight: 600,
                }}
              >
                Client : {sale.customer.name} {sale.customer.phone ? `(${sale.customer.phone})` : ''}
              </div>
            )}
            {sale.notes && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '4px 8px',
                  background: '#EFF6FF',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: '#1E40AF',
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                {sale.notes}
              </div>
            )}
          </div>

          {/* Ticket Items */}
          <div style={{ padding: '14px 0', borderBottom: '1px dashed #CBD5E1' }}>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '6px' }}>Article</th>
                  <th style={{ textAlign: 'center', paddingBottom: '6px' }}>Qté</th>
                  <th style={{ textAlign: 'right', paddingBottom: '6px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '6px 0', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ textAlign: 'center', padding: '6px 0', color: '#64748B' }}>x{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700 }}>
                      {(item.quantity * item.unitPrice).toLocaleString('fr-FR')} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ticket Total & Payment */}
          <div style={{ paddingTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>TOTAL :</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669' }}>
                {sale.totalAmount.toLocaleString('fr-FR')} {currency}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                color: '#64748B',
                background: '#F8FAFC',
                padding: '8px 12px',
                borderRadius: '8px',
              }}
            >
              <span>Règlement :</span>
              <span style={{ fontWeight: 700, color: '#1E293B' }}>{paymentMethodLabel}</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#94A3B8' }}>
              Merci pour votre achat ! À très bientôt.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: '16px 20px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: '#25D366',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              <Share2 size={16} />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              <Printer size={16} />
              <span>Imprimer</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Fermer
            </button>
            {onNewSale && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onNewSale}
                style={{ flex: 1 }}
              >
                + Autre vente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
