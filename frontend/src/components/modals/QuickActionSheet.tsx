import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, MinusCircle, UserPlus, CreditCard, PackagePlus, X } from 'lucide-react';
import { useModals } from '../../context/ModalContext';

export const QuickActionSheet: React.FC = () => {
  const { isQuickActionOpen, closeQuickAction, openSaleModal, openExpenseModal } = useModals();
  const navigate = useNavigate();

  if (!isQuickActionOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeQuickAction}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          borderRadius: '24px',
          padding: '24px',
          background: '#FFFFFF',
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0062FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enregistrement Express
            </span>
            <h2 style={{ fontSize: '1.3rem', margin: '4px 0 0', color: '#0F172A', fontWeight: 800 }}>
              Qu'est-ce que tu veux enregistrer ?
            </h2>
          </div>
          <button
            onClick={closeQuickAction}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* 1. Une vente */}
          <button
            onClick={() => {
              openSaleModal();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#EFF6FF',
                color: '#0062FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShoppingCart size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0F172A' }}>💰 Une vente</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Encaissement cash, Mobile Money ou crédit</div>
            </div>
          </button>

          {/* 2. Une dépense */}
          <button
            onClick={() => {
              openExpenseModal();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FFF4ED')}
            onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FFF4ED',
                color: '#FF6B00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MinusCircle size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0F172A' }}>💸 Une dépense</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Transport, loyer, électricité, ration...</div>
            </div>
          </button>

          {/* 3. Une dette client */}
          <button
            onClick={() => {
              closeQuickAction();
              navigate('/customers');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FFFBEB')}
            onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FFFBEB',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UserPlus size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0F172A' }}>👤 Une dette client</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Ajouter un débiteur ou enregistrer un crédit</div>
            </div>
          </button>

          {/* 4. Un paiement reçu */}
          <button
            onClick={() => {
              closeQuickAction();
              navigate('/customers');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CreditCard size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0F172A' }}>💵 Un paiement reçu</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Remboursement partiel ou total d'un client</div>
            </div>
          </button>

          {/* 5. Un achat de stock */}
          <button
            onClick={() => {
              closeQuickAction();
              navigate('/products');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#F5F3FF',
                color: '#7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PackagePlus size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0F172A' }}>📦 Un achat de stock</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Ajouter un produit ou réapprovisionner</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
