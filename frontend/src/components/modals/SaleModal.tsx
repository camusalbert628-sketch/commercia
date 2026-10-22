import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { api } from '../../services/api';
import { Product, Customer } from '../../types';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCreated: () => void;
}

export const SaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, onSaleCreated }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank_transfer' | 'credit'>('cash');
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<Array<{ name: string; quantity: number; unitPrice: number; productId?: string }>>([
    { name: '', quantity: 1, unitPrice: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      api.get<Product[]>('/products').then(setProducts).catch(() => {});
      api.get<Customer[]>('/customers').then(setCustomers).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProductSelect = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    // Check if product is already in items
    const existingIndex = items.findIndex(i => i.productId === prod.id);
    if (existingIndex > -1) {
      const nextItems = [...items];
      nextItems[existingIndex].quantity += 1;
      setItems(nextItems);
    } else {
      if (items.length === 1 && items[0].name === '' && items[0].unitPrice === 0) {
        setItems([{ name: prod.name, quantity: 1, unitPrice: prod.sellingPrice, productId: prod.id }]);
      } else {
        setItems([...items, { name: prod.name, quantity: 1, unitPrice: prod.sellingPrice, productId: prod.id }]);
      }
    }
    setSelectedProductId('');
  };

  const updateItem = (index: number, field: string, val: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    setItems(next);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ name: '', quantity: 1, unitPrice: 0 }]);
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: 1, unitPrice: 0 }]);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validItems = items.filter(i => i.name.trim() !== '' && i.unitPrice > 0);
    if (validItems.length === 0) {
      setError('Veuillez ajouter au moins un article avec un prix.');
      return;
    }

    if (paymentMethod === 'credit' && !customerId) {
      setError('Veuillez sélectionner un client pour une vente à crédit.');
      return;
    }

    try {
      setLoading(true);
      const computedTotal = validItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice || 0), 0);
      const res = await api.post<{ message: string }>('/sales', {
        items: validItems,
        totalAmount: computedTotal,
        paidAmount: paymentMethod === 'credit' ? 0 : computedTotal,
        paymentMethod,
        customerId: customerId || undefined,
      });

      setSuccessMsg(res.message);
      setTimeout(() => {
        onSaleCreated();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de la vente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: '#ECFDF5',
                color: '#059669',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Nouvelle Vente</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Enregistrement instantané (Cash, Mobile Money ou Crédit)
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '0.88rem' }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div style={{ padding: '12px 14px', background: '#DCFCE7', color: '#16A34A', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'pre-line' }}>
                {successMsg}
              </div>
            )}

            {/* Quick product selector from inventory */}
            {products.length > 0 && (
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Sélection rapide depuis le stock :
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => handleProductSelect(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Choisir un produit en stock --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.name} — {p.sellingPrice.toLocaleString('fr-FR')} FCFA ({p.quantity} en stock)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Items list */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Articles du panier</label>
                <button
                  type="button"
                  onClick={addItemRow}
                  style={{ background: 'transparent', color: '#059669', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Ajouter une ligne
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Désignation article"
                      value={item.name}
                      onChange={e => updateItem(idx, 'name', e.target.value)}
                      style={{ flex: 3 }}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qté"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      placeholder="Prix unit."
                      min="0"
                      step="50"
                      value={item.unitPrice || ''}
                      onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      style={{ flex: 2 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px', borderRadius: '8px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                Mode de règlement
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: 'cash', label: '💵 Espèces (Cash)' },
                  { id: 'mobile_money', label: '📱 Mobile Money' },
                  { id: 'credit', label: '⏳ À Crédit (Dette)' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      border: paymentMethod === m.id ? '2px solid #059669' : '1px solid #CBD5E1',
                      background: paymentMethod === m.id ? '#ECFDF5' : '#FFFFFF',
                      color: paymentMethod === m.id ? '#059669' : '#475569',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer selector (required for credit or optional for tracking) */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Client {paymentMethod === 'credit' && <span style={{ color: '#EF4444' }}>* (Obligatoire pour vente à crédit)</span>} :
              </label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                style={{ width: '100%' }}
                required={paymentMethod === 'credit'}
              >
                <option value="">-- Client comptoir (Anonyme) --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} {c.totalOwed > 0 ? `— Doit: ${c.totalOwed} FCFA` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Banner */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 600, color: '#64748B' }}>Total à encaisser :</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', fontFamily: 'Space Grotesk, sans-serif' }}>
                {totalAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || totalAmount <= 0}>
              {loading ? 'Enregistrement...' : `Valider la Vente (+${totalAmount.toLocaleString('fr-FR')} FCFA)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
