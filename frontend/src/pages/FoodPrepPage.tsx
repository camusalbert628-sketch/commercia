import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  TrendingUp,
  DollarSign,
  Coffee,
  Trash2,
  ChefHat,
  RefreshCw,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { PageGuideBanner } from '../components/common/PageGuideBanner';

export const FoodPrepPage: React.FC = () => {
  const { user, activeBusinessId } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const currency = activeBusiness?.currency || 'XAF';

  const [activeTab, setActiveTab] = useState<'preparations' | 'recipes'>('preparations');
  const [preparations, setPreparations] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Modals / Saisie
  const [showPrepModal, setShowPrepModal] = useState<boolean>(false);
  const [showRecipeModal, setShowRecipeModal] = useState<boolean>(false);
  const [selectedPrepForSale, setSelectedPrepForSale] = useState<any>(null);
  const [portionsToSell, setPortionsToSell] = useState<number>(1);
  const [salePaymentMethod, setSalePaymentMethod] = useState<string>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Pertes & Dons / Bonus
  const [showLossModal, setShowLossModal] = useState<boolean>(false);
  const [selectedPrepForLoss, setSelectedPrepForLoss] = useState<any>(null);
  const [lossCount, setLossCount] = useState<number>(0);
  const [offeredCount, setOfferedCount] = useState<number>(0);
  const [lossReason, setLossReason] = useState<string>('');

  // Combos Street-Food
  const [showComboModal, setShowComboModal] = useState<boolean>(false);
  const [comboName, setComboName] = useState<string>('');
  const [comboPrice, setComboPrice] = useState<number>(0);
  const [comboItems, setComboItems] = useState<Array<{ prepId: string; portions: number; name: string }>>([]);
  const [comboPaymentMethod, setComboPaymentMethod] = useState<string>('cash');
  const [comboCustomerId, setComboCustomerId] = useState<string>('');

  // Formulaire préparation
  const [prepDishName, setPrepDishName] = useState('');
  const [prepPortions, setPrepPortions] = useState<number | ''>('');
  const [prepSellingPrice, setPrepSellingPrice] = useState<number | ''>('');
  const [prepIngredientsCost, setPrepIngredientsCost] = useState<number | ''>('');
  const [prepRecipeId, setPrepRecipeId] = useState('');

  // Formulaire recette
  const [recipeName, setRecipeName] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('plat');
  const [recipeYield, setRecipeYield] = useState(1);
  const [recipePrice, setRecipePrice] = useState(0);
  const [ingredientsList, setIngredientsList] = useState<Array<{ name: string; quantity: number; unit: string; unitCost: number }>>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [prepsRes, recipesRes, sumRes, custRes]: any = await Promise.all([
        api.get('/food-prep/preparations'),
        api.get('/food-prep/recipes'),
        api.get('/food-prep/summary'),
        api.get('/customers').catch(() => ({ customers: [] })),
      ]);
      setPreparations(prepsRes?.preparations || []);
      setRecipes(recipesRes?.recipes || []);
      setSummary(sumRes || null);
      setCustomers(custRes?.customers || custRes || []);
    } catch (err: any) {
      console.error('Erreur chargement Restauration:', err);
      setError(err.message || 'Erreur lors du chargement des données de préparation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBusinessId]);

  const handleCreatePrep = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/food-prep/preparations', {
        dishName: prepDishName.trim(),
        portionsPrepared: Number(prepPortions) || 1,
        unitSellingPrice: Number(prepSellingPrice) || 0,
        ingredientsCost: Number(prepIngredientsCost) || 0,
        recipeId: prepRecipeId || undefined,
      });
      setShowPrepModal(false);
      setPrepDishName('');
      setPrepPortions('');
      setPrepSellingPrice('');
      setPrepIngredientsCost('');
      setPrepRecipeId('');
      setSuccess('Préparation journalière enregistrée avec succès !');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur enregistrement préparation.');
    }
  };

  const handleSellPortions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrepForSale) return;
    try {
      await api.put(`/food-prep/preparations/${selectedPrepForSale.id}/sell`, {
        portionsToSell: Number(portionsToSell),
        paymentMethod: salePaymentMethod,
        customerId: salePaymentMethod === 'credit' ? selectedCustomerId : undefined,
      });
      setSelectedPrepForSale(null);
      setSuccess(`${portionsToSell} portion(s) vendue(s) et enregistrée(s) en caisse !`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur vente portions.');
    }
  };

  const handleRecordLossAndOffered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrepForLoss) return;
    try {
      await api.put(`/food-prep/preparations/${selectedPrepForLoss.id}/losses`, {
        portionsLost: Number(lossCount) || 0,
        portionsOffered: Number(offeredCount) || 0,
        reason: lossReason || undefined,
      });
      setShowLossModal(false);
      setSelectedPrepForLoss(null);
      setLossCount(0);
      setOfferedCount(0);
      setLossReason('');
      setSuccess('Invendus et portions offertes enregistrés avec succès !');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur enregistrement pertes / dons.');
    }
  };

  const triggerComboPreset = (type: '300' | '400' | '500') => {
    const beignets = preparations.find(p => p.portionsRemaining > 0 && p.dishName.toLowerCase().includes('beignet'));
    const haricots = preparations.find(p => p.portionsRemaining > 0 && p.dishName.toLowerCase().includes('haricot'));
    const bouillie = preparations.find(p => p.portionsRemaining > 0 && p.dishName.toLowerCase().includes('bouillie'));

    let items: any[] = [];
    let name = '';
    let price = 0;

    if (type === '300') {
      name = '🥪 Combo Classique 300 F (Beignets + Haricots + Bouillie)';
      price = 300;
      if (beignets) items.push({ prepId: beignets.id, portions: 1, name: beignets.dishName });
      if (haricots) items.push({ prepId: haricots.id, portions: 1, name: haricots.dishName });
      if (bouillie) items.push({ prepId: bouillie.id, portions: 1, name: bouillie.dishName });
    } else if (type === '400') {
      name = '🌶️ Combo Taximan 400 F (Beignets x2 + Haricots)';
      price = 400;
      if (beignets) items.push({ prepId: beignets.id, portions: 2, name: beignets.dishName });
      if (haricots) items.push({ prepId: haricots.id, portions: 1, name: haricots.dishName });
    } else {
      name = '🍲 Grand Plat Emporté 500 F';
      price = 500;
      if (beignets) items.push({ prepId: beignets.id, portions: 2, name: beignets.dishName });
      if (haricots) items.push({ prepId: haricots.id, portions: 2, name: haricots.dishName });
    }

    if (items.length === 0 && preparations.length > 0) {
      const active = preparations.filter(p => p.portionsRemaining > 0);
      if (active.length > 0) {
        items = active.slice(0, 2).map(p => ({ prepId: p.id, portions: 1, name: p.dishName }));
      }
    }

    if (items.length === 0) {
      setError('Aucun plat avec portions disponibles pour lancer ce combo.');
      return;
    }

    setComboName(name);
    setComboPrice(price);
    setComboItems(items);
    setComboPaymentMethod('cash');
    setComboCustomerId('');
    setShowComboModal(true);
  };

  const handleSellCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comboItems.length === 0) return;
    try {
      await api.post('/food-prep/sell-combo', {
        comboName,
        items: comboItems.map(it => ({ prepId: it.prepId, portions: it.portions })),
        customTotalAmount: comboPrice,
        paymentMethod: comboPaymentMethod,
        customerId: comboPaymentMethod === 'credit' ? comboCustomerId : undefined,
      });
      setShowComboModal(false);
      setComboItems([]);
      setSuccess(`${comboName} enregistré avec succès en caisse !`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur enregistrement combo.');
    }
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/food-prep/recipes', {
        name: recipeName.trim(),
        category: recipeCategory,
        portionsYield: Number(recipeYield),
        sellingPricePerPortion: Number(recipePrice),
        ingredients: ingredientsList,
      });
      setShowRecipeModal(false);
      setSuccess('Fiche recette enregistrée !');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur enregistrement recette.');
    }
  };

  return (
    <div className="page-wrapper" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <Utensils size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Restauration, Recettes & Portions
              </h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                Pilotage des préparations du jour, coût réel des ingrédients consommés et suivi des invendus.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowPrepModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              background: '#0062FF',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 98, 255, 0.25)',
            }}
          >
            <Plus size={18} />
            Préparation du jour
          </button>
          <button
            onClick={() => setShowRecipeModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ChefHat size={18} color="#10B981" />
            Nouvelle Recette
          </button>
        </div>
      </div>

      <PageGuideBanner
        pageId="food_prep"
        title="Restauration, Cuisine & Traiteur"
        subtitle="Contrôlez vos fiches techniques, transformez vos ingrédients bruts en portions vendables et supprimez le coulage en cuisine."
        autoDomino={[
          "Chaque préparation cuisinée décompte automatiquement les stocks d'ingrédients bruts (riz, viande, huile, oignons).",
          "Chaque portion vendue au comptoir encaisse la recette directement dans la Caisse Journalière ouverte.",
          "Les invendus et avaries déclarés le soir sont automatiquement intégrés dans les pertes réelles sans fausser votre stock d'ingrédients.",
        ]}
        manualActions={[
          "Créer une Fiche Technique pour chaque plat avec le dosage exact des ingrédients pour 10 ou 50 portions.",
          "Déclarer le nombre exact de portions cuisinées le matin avant l'ouverture du service.",
          "Faire le point des invendus le soir en comptant les barquettes restantes.",
        ]}
        concreteExample="Vous préparez une marmite de 30 plats de Tiep poulet. Le coût des ingrédients bruts est de 22 500 F (750 F/portion). Vous vendez 28 portions à 1 500 F (42 000 F en caisse) et 2 restent invendues. Votre marge brute nette est de 19 500 F calculée automatiquement."
      />

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#047857', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('preparations')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'preparations' ? '3px solid #0062FF' : '3px solid transparent',
            color: activeTab === 'preparations' ? '#0062FF' : '#64748B',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          🍲 Service & Plats du jour ({preparations.length})
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'recipes' ? '3px solid #0062FF' : '3px solid transparent',
            color: activeTab === 'recipes' ? '#0062FF' : '#64748B',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          📜 Fiches Recettes ({recipes.length})
        </button>
      </div>

      {/* Financial Summary Card (Section 9 Formula) */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>RECETTES DU JOUR</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
              {(summary.totalRevenue || 0).toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '4px' }}>
              {summary.portionsSold || 0} portions vendues
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>INGRÉDIENTS CONSOMMÉS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EA580C', marginTop: '4px' }}>
              {(summary.realConsumedIngredientsCost || 0).toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
              Reste en réserve exclu
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>PORTIONS RESTANTES</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
              {summary.portionsRemaining || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#0284C7', marginTop: '4px' }}>
              Disponibles au service
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>BÉNÉFICE ESTIMÉ JOUR</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: (summary.estimatedDayMargin || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
              {(summary.estimatedDayMargin || 0).toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
              CA - Denrées consommées
            </div>
          </div>
        </div>
      )}

      {/* Règle des 3 Poches Widget (Street-Food & Restauration) */}
      {summary && (summary.totalRevenue || 0) > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 100%)', borderRadius: '14px', padding: '18px 20px', color: '#FFFFFF', marginBottom: '24px', boxShadow: '0 4px 15px rgba(11, 25, 44, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>💰</span>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                La Règle des 3 Poches (Répartition du Cash Journalier)
              </h4>
            </div>
            <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
              Recettes brutes : {(summary.totalRevenue || 0).toLocaleString('fr-FR')} {currency}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #F59E0B' }}>
              <div style={{ fontSize: '0.72rem', color: '#FCD34D', fontWeight: 800, textTransform: 'uppercase' }}>
                Poche 1 : Réassort Ingrédients (60%)
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: '4px', color: '#FFFFFF' }}>
                {Math.round((summary.totalRevenue || 0) * 0.60).toLocaleString('fr-FR')} {currency}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#CBD5E1', marginTop: '2px' }}>
                🔒 Intouchable pour le marché de demain (04h30)
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #38BDF8' }}>
              <div style={{ fontSize: '0.72rem', color: '#7DD3FC', fontWeight: 800, textTransform: 'uppercase' }}>
                Poche 2 : Charges & Tontine (15%)
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: '4px', color: '#FFFFFF' }}>
                {Math.round((summary.totalRevenue || 0) * 0.15).toLocaleString('fr-FR')} {currency}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#CBD5E1', marginTop: '2px' }}>
                🛡️ Tontine des femmes, place mairie & gaz/charbon
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #10B981' }}>
              <div style={{ fontSize: '0.72rem', color: '#6EE7B7', fontWeight: 800, textTransform: 'uppercase' }}>
                Poche 3 : Bénéfice Net Maman (25%)
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: '4px', color: '#FFFFFF' }}>
                {Math.round((summary.totalRevenue || 0) * 0.25).toLocaleString('fr-FR')} {currency}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#CBD5E1', marginTop: '2px' }}>
                🏠 Salaire net propre pour la popote & épargne
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Preparations List */}
      {activeTab === 'preparations' && (
        <div>
          {/* Touches Rapides Street-Food (Vente Express 1 Clic) */}
          {preparations.some(p => p.portionsRemaining > 0) && (
            <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                      Touches Rapides Street-Food (Vente Express 1 Clic)
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Pour le grand rush du matin : encaissez les combos classiques sans perdre une seconde.
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => triggerComboPreset('300')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #0062FF',
                    background: '#EFF6FF',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E40AF' }}>🥪 Combo Classique</span>
                  <span style={{ fontSize: '0.75rem', color: '#3B82F6', marginTop: '2px' }}>Beignets + Haricots + Bouillie</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0062FF', marginTop: '6px' }}>300 {currency}</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerComboPreset('400')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #EA580C',
                    background: '#FFF7ED',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#9A3412' }}>🌶️ Combo Chauffeur</span>
                  <span style={{ fontSize: '0.75rem', color: '#EA580C', marginTop: '2px' }}>Beignets x2 + Haricots piment</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#EA580C', marginTop: '6px' }}>400 {currency}</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerComboPreset('500')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #10B981',
                    background: '#ECFDF5',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#065F46' }}>🍲 Grand Plat Emporté</span>
                  <span style={{ fontSize: '0.75rem', color: '#059669', marginTop: '2px' }}>Grand repas complet copieux</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10B981', marginTop: '6px' }}>500 {currency}</span>
                </button>
              </div>
            </div>
          )}

          {preparations.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <Coffee size={40} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Aucune préparation enregistrée pour le service
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.88rem', maxWidth: '420px', margin: '8px auto 16px auto' }}>
                Enregistrez vos achats du marché et lancez votre première préparation du jour pour démarrer les encaissements.
              </p>
              <button
                onClick={() => setShowPrepModal(true)}
                style={{ padding: '10px 20px', background: '#0062FF', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                + Enregistrer la préparation du jour
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {preparations.map((prep) => {
                const soldPercent = prep.portionsPrepared > 0 ? Math.round((prep.portionsSold / prep.portionsPrepared) * 100) : 0;
                return (
                  <div key={prep.id} style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: prep.portionsRemaining > 0 ? '#ECFDF5' : '#F1F5F9', color: prep.portionsRemaining > 0 ? '#059669' : '#64748B' }}>
                          {prep.portionsRemaining > 0 ? '🟢 EN SERVICE' : 'CLÔTURÉ'}
                        </span>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', marginBottom: '2px' }}>
                          {prep.dishName}
                        </h3>
                        <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                          Prix portion : <strong>{prep.unitSellingPrice.toLocaleString('fr-FR')} {currency}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0062FF' }}>
                          {prep.portionsRemaining}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>disponibles</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', marginBottom: '4px' }}>
                        <span>Vendu : {prep.portionsSold} / {prep.portionsPrepared} ({soldPercent}%)</span>
                        {(prep.portionsLost > 0 || prep.portionsOffered > 0) && (
                          <span style={{ color: '#EF4444' }}>
                            {prep.portionsLost > 0 && `Pertes: ${prep.portionsLost} `}
                            {prep.portionsOffered > 0 && `Dons: ${prep.portionsOffered}`}
                          </span>
                        )}
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, soldPercent)}%`, height: '100%', background: '#10B981', borderRadius: '4px' }} />
                      </div>
                    </div>

                    {/* Financial details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <span>Recettes : <strong>{prep.totalRevenue.toLocaleString('fr-FR')} {currency}</strong></span>
                      <span>Coût ingr. : <strong>{prep.ingredientsCost.toLocaleString('fr-FR')} {currency}</strong></span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button
                        disabled={prep.portionsRemaining <= 0}
                        onClick={() => {
                          setSelectedPrepForSale(prep);
                          setPortionsToSell(1);
                          setSalePaymentMethod('cash');
                          setSelectedCustomerId('');
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: prep.portionsRemaining > 0 ? '#10B981' : '#E2E8F0',
                          color: prep.portionsRemaining > 0 ? '#FFFFFF' : '#94A3B8',
                          border: 'none',
                          fontWeight: 700,
                          cursor: prep.portionsRemaining > 0 ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Encaisser plat
                      </button>
                      <button
                        disabled={prep.portionsRemaining <= 0}
                        onClick={() => {
                          setSelectedPrepForLoss(prep);
                          setLossCount(0);
                          setOfferedCount(0);
                          setLossReason('');
                          setShowLossModal(true);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#FFFFFF',
                          color: '#EF4444',
                          border: '1px solid #FECACA',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: prep.portionsRemaining > 0 ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Pertes & Dons
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Recipes List */}
      {activeTab === 'recipes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {recipes.map((rec) => (
            <div key={rec.id} style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{rec.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Rendement moyen : {rec.portionsYield} portions</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0062FF' }}>
                    {rec.sellingPricePerPortion.toLocaleString('fr-FR')} {currency}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#10B981' }}>
                    Coût estimé : ~{rec.estimatedCostPerPortion.toLocaleString('fr-FR')} {currency} / portion
                  </div>
                </div>
              </div>

              {/* Ingrédients */}
              <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px', color: '#475569' }}>Ingrédients nécessaires :</div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155' }}>
                  {rec.ingredients?.map((ing: any) => (
                    <li key={ing.id} style={{ marginBottom: '2px' }}>
                      {ing.quantity} {ing.unit} de {ing.name} ({ing.unitCost.toLocaleString('fr-FR')} {currency}/{ing.unit})
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={() => {
                    setPrepDishName(rec.name);
                    setPrepPortions(rec.portionsYield);
                    setPrepSellingPrice(rec.sellingPricePerPortion);
                    setPrepIngredientsCost(rec.estimatedCostPerPortion * rec.portionsYield);
                    setPrepRecipeId(rec.id);
                    setShowPrepModal(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    background: '#0062FF',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Lancer la préparation de ce plat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Encaisser Portions */}
      {selectedPrepForSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '420px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Encaisser : {selectedPrepForSale.dishName}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: '16px' }}>
              Portions disponibles : <strong>{selectedPrepForSale.portionsRemaining}</strong>
            </p>

            <form onSubmit={handleSellPortions}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Nombre de portions à vendre :
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedPrepForSale.portionsRemaining}
                  value={portionsToSell}
                  onChange={(e) => setPortionsToSell(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '1rem', fontWeight: 700 }}
                  required
                />
                {/* Raccourcis Rapides de portions */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 5, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      disabled={n > selectedPrepForSale.portionsRemaining}
                      onClick={() => setPortionsToSell(n)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        background: portionsToSell === n ? '#0062FF' : '#F8FAFC',
                        color: portionsToSell === n ? '#FFFFFF' : '#0F172A',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: n <= selectedPrepForSale.portionsRemaining ? 'pointer' : 'not-allowed',
                      }}
                    >
                      +{n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPortionsToSell(selectedPrepForSale.portionsRemaining)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #10B981',
                      background: '#ECFDF5',
                      color: '#047857',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Tout ({selectedPrepForSale.portionsRemaining})
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Mode de règlement :
                </label>
                <select
                  value={salePaymentMethod}
                  onChange={(e) => setSalePaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
                >
                  <option value="cash">💵 Espèces (Cash)</option>
                  <option value="mobile_money">📱 Mobile Money (Orange / MTN / Wave)</option>
                  <option value="credit">⏳ À crédit (Ardoise quartier)</option>
                </select>
              </div>

              {/* Sélection Client obligatoire si vente à crédit */}
              {salePaymentMethod === 'credit' && (
                <div style={{ marginBottom: '14px', background: '#FFFBEB', padding: '12px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#B45309' }}>
                    👤 Client à débiter (Ardoise obligatoire) :
                  </label>
                  {customers.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: '#B45309' }}>
                      Aucun client enregistré. Rendez-vous dans le module <b>Clients & Dettes</b> pour créer la fiche client (ex: Papa Paul Menuisier).
                    </div>
                  ) : (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #F59E0B', background: '#FFFFFF', fontSize: '0.9rem' }}
                      required
                    >
                      <option value="">-- Sélectionner le client --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} - Dette actuelle : {(c.totalOwed || 0).toLocaleString('fr-FR')} {currency}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', marginBottom: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Montant total à encaisser :</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10B981' }}>
                  {(portionsToSell * selectedPrepForSale.unitSellingPrice).toLocaleString('fr-FR')} {currency}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPrepForSale(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={salePaymentMethod === 'credit' && !selectedCustomerId}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: (salePaymentMethod === 'credit' && !selectedCustomerId) ? '#94A3B8' : '#10B981',
                    color: 'white',
                    fontWeight: 700,
                    cursor: (salePaymentMethod === 'credit' && !selectedCustomerId) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Valider l'encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Déclarer Pertes & Dons (Bonus Fidélité / Dégustations) */}
      {showLossModal && selectedPrepForLoss && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Pertes & Dons : {selectedPrepForLoss.dishName}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: '16px' }}>
              Portions disponibles : <strong>{selectedPrepForLoss.portionsRemaining}</strong>
            </p>

            <form onSubmit={handleRecordLossAndOffered}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#047857' }}>
                    🎁 Dons / Bonus fidélité :
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedPrepForLoss.portionsRemaining}
                    value={offeredCount}
                    onChange={(e) => setOfferedCount(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #10B981', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Dégustations & cadeaux</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#B91C1C' }}>
                    🗑️ Avaries / Pertes :
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedPrepForLoss.portionsRemaining}
                    value={lossCount}
                    onChange={(e) => setLossCount(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #EF4444', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Brûlés, tombés, gâtés</span>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
                  Motif / Commentaire (optionnel) :
                </label>
                <input
                  type="text"
                  placeholder="ex: Fin de service / beignets offerts aux enfants"
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowLossModal(false);
                    setSelectedPrepForLoss(null);
                  }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={(Number(lossCount) + Number(offeredCount)) <= 0}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: (Number(lossCount) + Number(offeredCount)) > 0 ? '#0B192C' : '#94A3B8',
                    color: 'white',
                    fontWeight: 700,
                    cursor: (Number(lossCount) + Number(offeredCount)) > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Validation Combo Street-Food */}
      {showComboModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Valider la Vente Combo
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: '14px' }}>
              {comboName}
            </p>

            <form onSubmit={handleSellCombo}>
              <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Plats décomptés du service :
                </div>
                {comboItems.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                    <span>• {it.name}</span>
                    <strong>{it.portions} portion(s)</strong>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Mode de règlement :
                </label>
                <select
                  value={comboPaymentMethod}
                  onChange={(e) => setComboPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
                >
                  <option value="cash">💵 Espèces (Cash tiroir)</option>
                  <option value="mobile_money">📱 Mobile Money (Orange / MTN / Wave)</option>
                  <option value="credit">⏳ À crédit (Ardoise client)</option>
                </select>
              </div>

              {comboPaymentMethod === 'credit' && (
                <div style={{ marginBottom: '14px', background: '#FFFBEB', padding: '12px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#B45309' }}>
                    👤 Client à débiter (Ardoise) :
                  </label>
                  <select
                    value={comboCustomerId}
                    onChange={(e) => setComboCustomerId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #F59E0B', background: '#FFFFFF', fontSize: '0.9rem' }}
                    required
                  >
                    <option value="">-- Sélectionner le client --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ padding: '12px', background: '#ECFDF5', borderRadius: '8px', marginBottom: '18px', textAlign: 'center', border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '0.78rem', color: '#047857' }}>Total du combo à encaisser :</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#047857' }}>
                  {comboPrice.toLocaleString('fr-FR')} {currency}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowComboModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={comboPaymentMethod === 'credit' && !comboCustomerId}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: (comboPaymentMethod === 'credit' && !comboCustomerId) ? '#94A3B8' : '#0062FF',
                    color: 'white',
                    fontWeight: 700,
                    cursor: (comboPaymentMethod === 'credit' && !comboCustomerId) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Valider en caisse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Préparation du jour */}
      {showPrepModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Enregistrer une préparation du jour
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: '16px' }}>
              Renseignez les portions cuisinées et le montant engagé en achats frais.
            </p>

            <form onSubmit={handleCreatePrep}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  Nom du plat :
                </label>
                <input
                  type="text"
                  placeholder="ex: Riz sauce arachide & Poulet"
                  value={prepDishName}
                  onChange={(e) => setPrepDishName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Portions préparées :
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="ex: 20"
                    value={prepPortions}
                    onChange={(e) => setPrepPortions(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Prix portion ({currency}) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="ex: 1500"
                    value={prepSellingPrice}
                    onChange={(e) => setPrepSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  Coût des denrées et ingrédients ({currency}) :
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="ex: 12000"
                  value={prepIngredientsCost}
                  onChange={(e) => setPrepIngredientsCost(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Ne déduisez pas les denrées stockées pour demain (riz non cuit, épices de réserve).
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPrepModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#0062FF', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Recette */}
      {showRecipeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Nouvelle fiche recette
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: '16px' }}>
              Enregistrez vos ingrédients types pour estimer le coût de revient par plat.
            </p>

            <form onSubmit={handleCreateRecipe}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  Nom de la recette :
                </label>
                <input
                  type="text"
                  placeholder="ex: Ndolè royal aux crevettes & miondo"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Portions obtenues :
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={recipeYield}
                    onChange={(e) => setRecipeYield(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Prix de vente portion ({currency}) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={recipePrice}
                    onChange={(e) => setRecipePrice(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Ingrédients nécessaires :</span>
                  <button
                    type="button"
                    onClick={() => setIngredientsList([...ingredientsList, { name: '', quantity: 1, unit: 'kg', unitCost: 1000 }])}
                    style={{ fontSize: '0.75rem', color: '#0062FF', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Ajouter ingrédient
                  </button>
                </div>

                {ingredientsList.map((ing, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Nom ingrédient"
                      value={ing.name}
                      onChange={(e) => {
                        const copy = [...ingredientsList];
                        copy[idx].name = e.target.value;
                        setIngredientsList(copy);
                      }}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qté"
                      value={ing.quantity}
                      onChange={(e) => {
                        const copy = [...ingredientsList];
                        copy[idx].quantity = Number(e.target.value);
                        setIngredientsList(copy);
                      }}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Prix/U"
                      value={ing.unitCost}
                      onChange={(e) => {
                        const copy = [...ingredientsList];
                        copy[idx].unitCost = Number(e.target.value);
                        setIngredientsList(copy);
                      }}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIngredientsList(ingredientsList.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRecipeModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#10B981', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Sauvegarder la recette
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
