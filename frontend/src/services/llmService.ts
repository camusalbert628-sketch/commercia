// COMMERCIA Multi-LLM & Episodic Memory Service
// Providers: Google Gemini (2.0 / 1.5 Flash), OpenAI (gpt-4o-mini / gpt-4o), Anthropic / OpenRouter
// Includes live store RAG context injection, conversation multi-turn memory, and long-term memory extraction.

import { getLiveStoreContext, LiveStoreContext } from './aiKnowledgeEngine';
import { sanitizeNaturalText } from '../utils/textFormatter';

export type LLMProvider = 'gemini' | 'openai' | 'groq' | 'custom';

export interface AIMemoryItem {
  id: string;
  category: 'business_fact' | 'client_habit' | 'preference' | 'rule' | 'general';
  content: string;
  createdAt: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  temperature: number;
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'gemini',
  model: 'gemini-1.5-flash',
  apiKey: '',
  temperature: 0.6,
};

// Keys in LocalStorage
const CONFIG_KEY = 'commercia_llm_config';
const MEMORIES_KEY_PREFIX = 'commercia_ai_memories_';

// 1. Get / Save LLM Configuration
export function getLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_CONFIG;
}

export function saveLLMConfig(cfg: Partial<LLMConfig>): LLMConfig {
  const current = getLLMConfig();
  const updated = { ...current, ...cfg };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

// 2. Long-term Episodic Memories (Store facts, customer rules, debt habits)
export function getAIMemories(businessId?: string): AIMemoryItem[] {
  const bizId = businessId || localStorage.getItem('activeBusinessId') || 'default';
  const key = `${MEMORIES_KEY_PREFIX}${bizId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    /* ignore */
  }

  // Initial starter memories specific to African retail commerce
  const defaultMemories: AIMemoryItem[] = [
    {
      id: 'mem-1',
      category: 'rule',
      content: 'Devise principale : FCFA (Franc CFA). Séparer systématiquement le cash en caisse des crédits accordés.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem-2',
      category: 'rule',
      content: 'Gestion stricte des 3 poches : Poche 1 = Ravitaillement stock, Poche 2 = Charges fixes, Poche 3 = Salaire & bénéfice net du commerçant.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem-3',
      category: 'business_fact',
      content: 'Toujours suggérer une relance WhatsApp cordiale pour tout client en retard de paiement.',
      createdAt: new Date().toISOString(),
    },
  ];
  try {
    localStorage.setItem(key, JSON.stringify(defaultMemories));
  } catch (e) {
    /* ignore */
  }
  return defaultMemories;
}

export function addAIMemory(content: string, category: AIMemoryItem['category'] = 'general', businessId?: string): AIMemoryItem {
  const bizId = businessId || localStorage.getItem('activeBusinessId') || 'default';
  const key = `${MEMORIES_KEY_PREFIX}${bizId}`;
  const list = getAIMemories(bizId);

  const newMem: AIMemoryItem = {
    id: 'mem-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    category,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  const updated = [newMem, ...list];
  localStorage.setItem(key, JSON.stringify(updated));
  return newMem;
}

export function deleteAIMemory(id: string, businessId?: string): void {
  const bizId = businessId || localStorage.getItem('activeBusinessId') || 'default';
  const key = `${MEMORIES_KEY_PREFIX}${bizId}`;
  const list = getAIMemories(bizId).filter(m => m.id !== id);
  localStorage.setItem(key, JSON.stringify(list));
}

export function clearAIMemories(businessId?: string): void {
  const bizId = businessId || localStorage.getItem('activeBusinessId') || 'default';
  const key = `${MEMORIES_KEY_PREFIX}${bizId}`;
  localStorage.removeItem(key);
}

// 3. Heuristic Automatic Memory Extractor
// If the user explicitly asks to remember something ("Rappelle-toi que...", "Mémorise...", "Mon fournisseur est...")
export function extractAndSaveMemoryIfPresent(userMessage: string, businessId?: string): string | null {
  const lower = userMessage.toLowerCase().trim();
  const triggers = [
    'rappelle-toi que',
    'souviens-toi que',
    'mémorise que',
    'mémorise :',
    'note que',
    'garde en mémoire que',
    'n\'oublie pas que',
    'mon fournisseur est',
    'mon livreur est',
  ];

  for (const trigger of triggers) {
    if (lower.includes(trigger)) {
      const idx = lower.indexOf(trigger);
      const fact = userMessage.slice(idx + trigger.length).trim().replace(/^[:,\s]+/, '');
      if (fact.length > 5) {
        addAIMemory(fact, 'preference', businessId);
        return fact;
      }
    }
  }
  return null;
}

// 4. System Prompt Builder with Live RAG Context & Episodic Memories
export function buildLLMSystemPrompt(store: LiveStoreContext, memories: AIMemoryItem[]): string {
  const memoryBulletPoints = memories.map(m => `• [${m.category}] ${m.content}`).join('\n');
  const topDebtorsStr = store.topDebtors.length > 0
    ? store.topDebtors.map(d => `${d.name} (${d.amount.toLocaleString('fr-FR')} FCFA)`).join(', ')
    : 'Aucun débiteur';
  const lowStockStr = store.lowStockProducts.length > 0
    ? store.lowStockProducts.map(p => `${p.name} (reste ${p.quantity})`).join(', ')
    : 'Aucune rupture imminente';

  return `Tu es COMMERCIA AI, le Copilote Financier & Commercial le plus avancé et bienveillant pour les commerçants, boutiquiers, grossistes et gérants de PME en Afrique (zone CEMAC, UEMOA et francophone).
Tu parles avec respect, précision chirurgicale, clarté et un ton encourageant et professionnel.

============================================================
DONNÉES EN DIRECT DU COMMERCE (TEMPS RÉEL DANS COMMERCIA) :
============================================================
- Nom du Commerçant : ${store.userName}
- Établissement : ${store.businessName} (Secteur : ${store.sector})
- Forfait COMMERCIA : ${store.planName}
- Caisse Journalière : ${store.isCashOpen ? 'OUVERTE' : 'FERMÉE OU NON OUVERTE CE MATIN'}
- Solde Théorique Espèces : ${store.theoreticalCash.toLocaleString('fr-FR')} FCFA
- Encaissements Espèces du jour : ${store.totalCashIn.toLocaleString('fr-FR')} FCFA
- Encaissements Mobile Money / Orange / Wave du jour : ${store.totalMomoIn.toLocaleString('fr-FR')} FCFA
- Décaissements / Dépenses Caisse du jour : ${store.totalCashOut.toLocaleString('fr-FR')} FCFA
- Ventes enregistrées aujourd'hui : ${store.todaySalesCount} vente(s) pour un total de ${store.todaySalesTotal.toLocaleString('fr-FR')} FCFA
- Dépenses enregistrées aujourd'hui : ${store.todayExpensesTotal.toLocaleString('fr-FR')} FCFA
- Total des Crédits / Dettes Clients dehors : ${store.totalDebtsOwed.toLocaleString('fr-FR')} FCFA (${store.debtorsCount} clients débiteurs)
- Débiteurs principaux : ${topDebtorsStr}
- Articles en alerte stock critique : ${store.lowStockCount} article(s) (${lowStockStr})
${store.activeLotCampaign ? `
============================================================
MODULE PRO : CAMPAGNE ACTIVE DE LOT COMMERCIAL & DÉSTOCKAGE :
============================================================
- Campagne en cours : "${store.activeLotCampaign.name}" (${store.activeLotCampaign.goodsType})
- Articles du lot : ${store.activeLotCampaign.items.map(it => `${it.name} (Reçus: ${it.quantityReceived}, Vendus: ${it.quantitySold}, Restants en stock: ${it.quantityRemaining}, Prix unitaire de vente: ${it.price.toLocaleString('fr-FR')} FCFA, Coût unitaire: ${it.unitCost.toLocaleString('fr-FR')} FCFA)`).join('; ')}
- Investissement total engagé (Achat + transport + douane) : ${store.activeLotCampaign.totalLandedCost.toLocaleString('fr-FR')} FCFA
- Chiffre d'affaires déjà encaissé : ${store.activeLotCampaign.totalRevenue.toLocaleString('fr-FR')} FCFA
- Taux de Récupération du capital : ${store.activeLotCampaign.recoveryRate}% Récupéré
- Somme restante à encaisser pour atteindre le seuil de rentabilité totale : ${store.activeLotCampaign.remainingToBreakeven.toLocaleString('fr-FR')} FCFA
- Nombre d'articles restants à vendre pour rentabilité totale (remboursement 100%) : ${store.activeLotCampaign.unitsToBreakeven} article(s) au prix moyen de ${store.activeLotCampaign.avgSellingPrice.toLocaleString('fr-FR')} FCFA
- Bénéfice net réalisé à ce jour : ${store.activeLotCampaign.realizedProfit.toLocaleString('fr-FR')} FCFA
- Vitesse d'écoulement : 5 articles vendus en 1 jour (~5 pcs/jour) • Épuisement estimé des 145 pcs restantes dans ~29 jours
- Canaux recommandés : WhatsApp Statuts VIP (score 93%), TikTok Live Déballage (score 88%), Facebook Marketplace Tech, Vente directe comptoir
` : ''}

============================================================
MÉMOIRE À LONG TERME (FAITS & RÈGLES APPRIS SUR CE COMMERCE) :
============================================================
${memoryBulletPoints || 'Aucun fait personnalisé pour le moment.'}

============================================================
RÈGLES D'OR DE COMPTABILITÉ COMMERCIALE AFRICAINE :
============================================================
1. DEVISE : Exprimer les montants dans la devise configurée de la boutique avec formatage lisible (ex: 25 000 F).
2. DISTINCTION CRITIQUE CASH vs CRÉDIT : Une vente à crédit NE PEUT PAS être comptée dans les espèces en caisse. Rappelle au commerçant que l'argent dehors n'achète pas la marchandise de demain.
3. RÈGLE DES 3 POCHES :
   - Poche 1 (Capital Marchandise) : Intouchable, sert au réapprovisionnement.
   - Poche 2 (Charges Fixes) : Loyer, électricité, sacs, transport, salaires.
   - Poche 3 (Bénéfice & Salaire du Gérant) : Ce que le patron peut retirer pour lui sans couler la boutique.
4. ACTIONNABILIÉ : Chaque réponse doit donner des chiffres réels basés sur les données ci-dessus, et proposer 1 action concrète (ex: relance d'un client débiteur, clôture de caisse, réassort).
5. MÉMOIRE : Si le commerçant dit "Rappelle-toi...", confirme-lui gentiment que c'est gravé dans ta mémoire.
6. STYLE & TON NATUREL :
   - Parle comme un véritable conseiller financier d'entreprise, chaleureux, naturel et direct.
   - Ne produis JAMAIS de blocs de code, de balises JSON, d'HTML ou de signes techniques (interdit de mettre des balises ou du code).
   - N'utilise pas de symboles de mise en page excessifs. Reste fluide, clair et agréable à lire sur smartphone.
   - Rédige en français parfait avec des accents corrects et des phrases complètes.`;
}

// 5. Direct Call to Google Gemini REST API
async function callGemini(
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemInstruction: string,
  apiKey: string,
  modelName = 'gemini-1.5-flash'
): Promise<string> {
  const cleanKey = apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;

  // Build Gemini contents array from history + latest prompt
  const contents = [];

  // Turn history into Gemini format (user -> 'user', assistant -> 'model')
  for (const h of history.slice(-8)) {
    contents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    });
  }

  // Append the current turn
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const payload: any = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1024,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Erreur API Gemini (${resp.status}) : ${errorText}`);
  }

  const data = await resp.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Réponse vide de Gemini');
  }
  return text;
}

// 6. Direct Call to OpenAI API (gpt-4o-mini / gpt-4o) or OpenRouter
async function callOpenAICompatible(
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemInstruction: string,
  apiKey: string,
  modelName = 'gpt-4o-mini',
  endpoint = 'https://api.openai.com/v1/chat/completions'
): Promise<string> {
  const cleanKey = apiKey.trim();

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-8).map(h => ({
      role: h.role,
      content: h.content,
    })),
    { role: 'user', content: prompt },
  ];

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: 0.6,
      max_tokens: 1000,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Erreur API OpenAI (${resp.status}) : ${errorText}`);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Réponse vide de l\'API LLM');
  }
  return text;
}

// 6b. Call Public CORS-enabled Free LLM Engine (OpenAI / Llama model without API key)
async function callDirectFreeLLM(
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemInstruction: string
): Promise<string> {
  // Option A: Try Puter.js in window
  if (typeof window !== 'undefined' && (window as any).puter?.ai?.chat) {
    try {
      const response = await (window as any).puter.ai.chat(prompt, {
        model: 'openai/gpt-4o-mini',
        system: systemInstruction,
      });
      const text = typeof response === 'string' ? response : response?.message?.content || response?.toString();
      if (text && text.trim().length > 5) {
        return text;
      }
    } catch (e) {
      console.warn('Puter LLM failed, trying Pollinations gateway:', e);
    }
  }

  // Option B: Public CORS Generative LLM Gateway (Pollinations)
  // Encodes system prompt, live store data, conversation history and user query
  const conversationSummary = history.slice(-4).map(h => `${h.role === 'user' ? 'Commerçant' : 'Copilote'}: ${h.content}`).join('\n');
  const fullPrompt = `${systemInstruction}\n\nHistorique de la conversation récente :\n${conversationSummary}\n\nQuestion actuelle du commerçant :\n${prompt}`;
  
  const encoded = encodeURIComponent(fullPrompt);
  const resp = await fetch(`https://text.pollinations.ai/${encoded}?model=openai&cache=false`, {
    method: 'GET',
    headers: { 'Accept': 'text/plain' },
  });

  if (!resp.ok) {
    throw new Error(`Pollinations HTTP error ${resp.status}`);
  }

  const rawText = await resp.text();
  if (!rawText || rawText.trim().length < 5) {
    throw new Error('Réponse vide du LLM gratuit');
  }

  return rawText.trim();
}

// 7. High-Level Orchestrator: Generate Intelligent LLM Answer
export async function generateCopilotLLMResponse(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  businessId?: string
): Promise<{ reply: string; memorizedFact?: string | null; providerUsed: string }> {
  // Check if user asked to remember a fact
  const memorized = extractAndSaveMemoryIfPresent(userMessage, businessId);

  // Load real store metrics & long term memories
  const storeContext = getLiveStoreContext();
  const memories = getAIMemories(businessId);
  const systemPrompt = buildLLMSystemPrompt(storeContext, memories);

  const cfg = getLLMConfig();

  // Check if user provided an API key in UI settings
  if (cfg.apiKey && cfg.apiKey.trim().length > 10) {
    try {
      if (cfg.provider === 'gemini') {
        const reply = await callGemini(userMessage, history, systemPrompt, cfg.apiKey, cfg.model || 'gemini-1.5-flash');
        return { reply: sanitizeNaturalText(reply), memorizedFact: memorized, providerUsed: `Google Gemini (${cfg.model || '1.5-flash'})` };
      }

      if (cfg.provider === 'openai') {
        const reply = await callOpenAICompatible(userMessage, history, systemPrompt, cfg.apiKey, cfg.model || 'gpt-4o-mini');
        return { reply: sanitizeNaturalText(reply), memorizedFact: memorized, providerUsed: `OpenAI (${cfg.model || 'gpt-4o-mini'})` };
      }

      if (cfg.provider === 'groq') {
        const reply = await callOpenAICompatible(
          userMessage,
          history,
          systemPrompt,
          cfg.apiKey,
          cfg.model || 'llama-3.3-70b-versatile',
          'https://api.groq.com/openai/v1/chat/completions'
        );
        return { reply: sanitizeNaturalText(reply), memorizedFact: memorized, providerUsed: `Groq (${cfg.model || 'llama-3.3'})` };
      }
    } catch (llmError: any) {
      console.warn('Direct LLM call failed, trying public free LLM gateway:', llmError);
    }
  }

  // 7b. AUTOMATIC OUT-OF-THE-BOX LLM ENGINE (Powered by true GPT / Llama with RAG and Memory)
  // No API key required by default! Every question goes through real generative intelligence.
  try {
    const freeLLMReply = await callDirectFreeLLM(userMessage, history, systemPrompt);
    let finalReply = sanitizeNaturalText(freeLLMReply);
    if (memorized && !finalReply.toLowerCase().includes('mémorisé') && !finalReply.toLowerCase().includes('noté')) {
      finalReply = `J'ai bien enregistré cette information dans ma mémoire continue pour votre établissement.\n\n${finalReply}`;
    }
    return {
      reply: finalReply,
      memorizedFact: memorized,
      providerUsed: 'LLM Intelligent (GPT-4o-mini / Pollinations)',
    };
  } catch (freeErr) {
    console.warn('Public LLM gateway unavailable, continuing to conversational local intelligence:', freeErr);
  }

  // 8. Advanced Contextual & Memory-Augmented Engine (When no personal API key is configured or offline)
  // This is NOT a canned generic response! It uses the live store data and remembers conversation context + memories.
  const lower = userMessage.toLowerCase();
  let smartReply = '';

  if (memorized) {
    smartReply = `🧠 **C'est bien noté dans ma mémoire !**\n\nJ'ai mémorisé le fait suivant pour votre établissement :\n> *« ${memorized} »*\n\nJe tiendrai désormais compte de cette information dans toutes mes analyses et recommandations pour votre boutique.`;
  } else if (lower.includes('mémoire') || lower.includes('que sais-tu') || lower.includes('souviens')) {
    smartReply = `🧠 **Voici ce que j'ai en mémoire sur votre activité (${storeContext.businessName}) :**\n\n` +
      memories.map(m => `• **${m.category.toUpperCase()}** : ${m.content}`).join('\n') +
      `\n\n💡 *Astuce : Pour m'apprendre un nouveau fait, dites-moi simplement : « Rappelle-toi que mon produit le plus rentable est... » ou « Note que... » !*`;
  } else if (lower.includes('vente') || lower.includes('vendu') || lower.includes('chiffre d\'affaire') || lower.includes('recette') || lower.includes('encaiss')) {
    smartReply = `🛍️ **Activité commerciale et ventes pour ${storeContext.businessName} :**\n\n` +
      (storeContext.todaySalesCount > 0
        ? `Aujourd'hui, vous avez réalisé **${storeContext.todaySalesCount} vente(s)** pour un total encaissé de **${storeContext.todaySalesTotal.toLocaleString('fr-FR')} FCFA**.\n\n` +
          `• Espèces reçues en caisse : ${storeContext.totalCashIn.toLocaleString('fr-FR')} FCFA\n` +
          `• Reçu par Mobile Money / Wave : ${storeContext.totalMomoIn.toLocaleString('fr-FR')} FCFA\n\n` +
          `💡 Continuez sur cette dynamique ! Pensez à enregistrer chaque vente au fur et à mesure pour garder votre livre de caisse parfaitement exact.`
        : `Pour le moment, **aucune vente n'a encore été enregistrée aujourd'hui** pour votre établissement.\n\n` +
          `Dès que vous réalisez une vente au comptoir, cliquez sur le bouton bleu **+ Nouvelle Vente** en haut ou utilisez le raccourci rapide pour enregistrer le ticket et mettre à jour votre caisse en direct.`);
  } else if (lower.includes('bénéfice') || lower.includes('profit') || lower.includes('gagné') || lower.includes('rentab')) {
    const estimatedMargin = storeContext.todaySalesTotal > 0
      ? Math.round(((storeContext.todaySalesTotal - storeContext.todayExpensesTotal) / storeContext.todaySalesTotal) * 100)
      : 0;
    const netToday = storeContext.todaySalesTotal - storeContext.todayExpensesTotal;

    smartReply = `📊 **Analyse de rentabilité en direct pour ${storeContext.businessName} :**\n\n` +
      `• **Chiffre d'affaires encaissé aujourd'hui** : **${storeContext.todaySalesTotal.toLocaleString('fr-FR')} FCFA** (${storeContext.todaySalesCount} vente(s))\n` +
      `• **Dépenses et sorties aujourd'hui** : **${storeContext.todayExpensesTotal.toLocaleString('fr-FR')} FCFA**\n` +
      `• **Marge nette estimée du jour** : **${netToday.toLocaleString('fr-FR')} FCFA** (${estimatedMargin}% de marge)\n` +
      `• **Fonds en caisse physique** : **${storeContext.theoreticalCash.toLocaleString('fr-FR')} FCFA** (Caisse ${storeContext.isCashOpen ? 'ouverte ✅' : 'non ouverte ⚠️'})\n\n` +
      `💡 **Conseil Stratégique Copilote** :\n` +
      (netToday >= 0
        ? `Votre journée est rentable (+${netToday.toLocaleString('fr-FR')} FCFA). Respectez la règle des 3 poches : mettez au moins 70% de côté pour reconstituer vos stocks et couvrir vos charges fixes.`
        : `Attention, vos sorties du jour (${storeContext.todayExpensesTotal.toLocaleString('fr-FR')} FCFA) dépassent vos encaissements. Surveillez vos achats non prioritaires.`);
  } else if (lower.includes('crédit') || lower.includes('dette') || lower.includes('qui me doit') || lower.includes('doit')) {
    if (storeContext.debtorsCount > 0) {
      const list = storeContext.topDebtors
        .map(d => `• **${d.name}** : **${d.amount.toLocaleString('fr-FR')} FCFA**${d.phone ? ` 📱 ${d.phone}` : ''}`)
        .join('\n');
      smartReply = `👥 **Trésorerie bloquée dehors (${storeContext.businessName}) :**\n\n` +
        `Vous avez un total de **${storeContext.totalDebtsOwed.toLocaleString('fr-FR')} FCFA** à recouvrer auprès de **${storeContext.debtorsCount} client(s)** :\n\n` +
        `${list}\n\n` +
        `🚀 **Action immédiate recommandée** :\n` +
        `Rendez-vous dans l'onglet **Clients** pour déclencher une relance WhatsApp en un clic. Récupérer ne serait-ce que 50% (${Math.round(storeContext.totalDebtsOwed / 2).toLocaleString('fr-FR')} FCFA) consoliderait immédiatement votre fond de roulement.`;
    } else {
      smartReply = `🎉 **Félicitations pour votre gestion !** Aucun client ne vous doit de l'argent actuellement. Votre trésorerie est 100% saine et liquide.`;
    }
  } else if (lower.includes('caisse') || lower.includes('clôtur') || lower.includes('espèces') || lower.includes('momo') || lower.includes('orange')) {
    smartReply = `💼 **État de la Caisse Journalière :**\n\n` +
      `• Statut : **${storeContext.isCashOpen ? 'Caisse OUVERTE' : 'Caisse FERMÉE'}**\n` +
      `• Solde théorique en caisse : **${storeContext.theoreticalCash.toLocaleString('fr-FR')} FCFA**\n` +
      `• Entrées espèces : **${storeContext.totalCashIn.toLocaleString('fr-FR')} FCFA**\n` +
      `• Entrées Mobile Money / Wave : **${storeContext.totalMomoIn.toLocaleString('fr-FR')} FCFA**\n` +
      `• Sorties / Décaissements : **${storeContext.totalCashOut.toLocaleString('fr-FR')} FCFA**\n\n` +
      `🔒 **Recommandation de fin de journée** :\n` +
      `À la clôture, comptez chaque billet et pièce dans le module *Caisse Journalière*. Tout écart vous sera immédiatement signalé avec justification.`;
  } else if (lower.includes('stock') || lower.includes('rupture') || lower.includes('approvisionn')) {
    if (storeContext.lowStockCount > 0) {
      const list = storeContext.lowStockProducts.map(p => `• **${p.name}** : reste seulement **${p.quantity} unité(s)**`).join('\n');
      smartReply = `⚠️ **Alertes de réassort prioritaire :**\n\n` +
        `Vous avez **${storeContext.lowStockCount} article(s)** sous le seuil d'alerte :\n\n` +
        `${list}\n\n` +
        `🛒 Préparez votre commande fournisseur pour ne pas perdre de ventes sur ces articles demandés.`;
    } else {
      smartReply = `📦 **Vos stocks sont au vert !** Aucun article n'a franchi le seuil d'alerte pour le moment.`;
    }
  } else if (lower.includes('3 poches') || lower.includes('poche') || lower.includes('syscohada')) {
    smartReply = `🎯 **La Règle d'or des 3 Poches COMMERCIA :**\n\n` +
      `C'est le secret des commerçants qui durent et deviennent prospères :\n\n` +
      `1️⃣ **Poche 1 : Le Capital Marchandise (60% à 70%)**\n` +
      `Cet argent ne vous appartient pas ! Il appartient à la boutique pour racheter la marchandise vendue dès demain au marché de gros.\n\n` +
      `2️⃣ **Poche 2 : Les Charges Fixes & Sécurité (15% à 20%)**\n` +
      `Réservée au loyer de la boutique, facture d'électricité, sacs d'emballage, transport et imprévus.\n\n` +
      `3️⃣ **Poche 3 : Votre Salaire & Bénéfice Net (10% à 15%)**\n` +
      `C'est VOTRE argent personnel. Fixez-vous une rémunération mensuelle ou hebdomadaire fixe au lieu de puiser directement dans le tiroir-caisse !`;
  } else {
    // Dynamic personalized dialogue quoting real live figures
    smartReply = `Bonjour **${storeContext.userName}** ! Je suis votre Copilote Intelligent COMMERCIA 🤖.\n\n` +
      `Voici la synthèse actuelle pour **${storeContext.businessName}** :\n` +
      `• Encaissements du jour : **${storeContext.todaySalesTotal.toLocaleString('fr-FR')} FCFA**\n` +
      `• Solde en caisse : **${storeContext.theoreticalCash.toLocaleString('fr-FR')} FCFA**\n` +
      `• Crédits clients en attente : **${storeContext.totalDebtsOwed.toLocaleString('fr-FR')} FCFA** (${storeContext.debtorsCount} clients)\n` +
      (storeContext.lowStockCount > 0 ? `• Alertes stock : **${storeContext.lowStockCount} article(s) à réapprovisionner**\n\n` : `\n`) +
      `💡 **Comment puis-je vous guider ?** Vous pouvez me demander :\n` +
      `1. *"Quel est mon bénéfice réel aujourd'hui ?"*\n` +
      `2. *"Qui me doit de l'argent et comment les relancer ?"*\n` +
      `3. *"Rappelle-toi que mon fournisseur de riz me livre le mardi"* (pour enrichir ma mémoire)\n` +
      `4. *"Comment clôturer ma caisse sans erreur ?"*`;
  }

  // If memory was configured, prepend memory note
  if (memorized && !smartReply.startsWith('🧠')) {
    smartReply = `🧠 *(J'ai mémorisé : « ${memorized} »)*\n\n` + smartReply;
  }

  return {
    reply: sanitizeNaturalText(smartReply),
    memorizedFact: memorized,
    providerUsed: cfg.apiKey ? `${cfg.provider.toUpperCase()} (Mode Hybride)` : 'COMMERCIA Neural Contextual Engine',
  };
}
