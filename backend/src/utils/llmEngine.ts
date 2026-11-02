export interface LlmTestResult {
  success: boolean;
  latencyMs: number;
  provider: string;
  model: string;
  responseSample?: string;
  tokenCount?: number;
  error?: string;
}

/**
 * Effectue un test de connectivité réel et direct avec un fournisseur LLM
 * sans exposer la clé côté client.
 */
export async function testLlmConnection(
  provider: string,
  apiKey: string,
  model?: string,
  apiUrl?: string
): Promise<LlmTestResult> {
  const start = Date.now();
  const trimmedKey = (apiKey || '').trim();

  if (!trimmedKey) {
    return {
      success: false,
      latencyMs: 0,
      provider,
      model: model || 'inconnu',
      error: 'Clé API vide ou non fournie.',
    };
  }

  try {
    switch (provider.toLowerCase()) {
      case 'gemini':
      case 'google_gemini': {
        const selectedModel = model || 'gemini-1.5-flash';
        const url = apiUrl || `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reponds uniquement par: PING_OK' }] }],
            generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
          }),
        });

        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return { success: false, latencyMs, provider: 'gemini', model: selectedModel, error: errMsg };
        }

        const data: any = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';
        return {
          success: true,
          latencyMs,
          provider: 'gemini',
          model: selectedModel,
          responseSample: reply,
          tokenCount: data?.usageMetadata?.totalTokenCount || 5,
        };
      }

      case 'openai': {
        const selectedModel = model || 'gpt-4o-mini';
        const url = apiUrl || 'https://api.openai.com/v1/chat/completions';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${trimmedKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: 'Say PING_OK' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return { success: false, latencyMs, provider: 'openai', model: selectedModel, error: errMsg };
        }

        const data: any = await res.json();
        return {
          success: true,
          latencyMs,
          provider: 'openai',
          model: selectedModel,
          responseSample: data?.choices?.[0]?.message?.content?.trim() || 'OK',
          tokenCount: data?.usage?.total_tokens || 5,
        };
      }

      case 'anthropic': {
        const selectedModel = model || 'claude-3-5-haiku-20241022';
        const url = apiUrl || 'https://api.anthropic.com/v1/messages';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': trimmedKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: 'Say PING_OK' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return { success: false, latencyMs, provider: 'anthropic', model: selectedModel, error: errMsg };
        }

        const data: any = await res.json();
        return {
          success: true,
          latencyMs,
          provider: 'anthropic',
          model: selectedModel,
          responseSample: data?.content?.[0]?.text?.trim() || 'OK',
          tokenCount: (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0),
        };
      }

      case 'groq': {
        const selectedModel = model || 'llama-3.3-70b-versatile';
        const url = apiUrl || 'https://api.groq.com/openai/v1/chat/completions';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${trimmedKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: 'Say PING_OK' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return { success: false, latencyMs, provider: 'groq', model: selectedModel, error: errMsg };
        }

        const data: any = await res.json();
        return {
          success: true,
          latencyMs,
          provider: 'groq',
          model: selectedModel,
          responseSample: data?.choices?.[0]?.message?.content?.trim() || 'OK',
          tokenCount: data?.usage?.total_tokens || 5,
        };
      }

      case 'mistral': {
        const selectedModel = model || 'mistral-small-latest';
        const url = apiUrl || 'https://api.mistral.ai/v1/chat/completions';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${trimmedKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: 'Say PING_OK' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return { success: false, latencyMs, provider: 'mistral', model: selectedModel, error: errMsg };
        }

        const data: any = await res.json();
        return {
          success: true,
          latencyMs,
          provider: 'mistral',
          model: selectedModel,
          responseSample: data?.choices?.[0]?.message?.content?.trim() || 'OK',
          tokenCount: data?.usage?.total_tokens || 5,
        };
      }

      case 'deepseek': {
        const selectedModel = model || 'deepseek-chat';
        const url = apiUrl || 'https://api.deepseek.com/chat/completions';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${trimmedKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: 'Say PING_OK' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return { success: false, latencyMs, provider: 'deepseek', model: selectedModel, error: errMsg };
        }

        const data: any = await res.json();
        return {
          success: true,
          latencyMs,
          provider: 'deepseek',
          model: selectedModel,
          responseSample: data?.choices?.[0]?.message?.content?.trim() || 'OK',
          tokenCount: data?.usage?.total_tokens || 5,
        };
      }

      case 'openrouter': {
        const selectedModel = model || 'meta-llama/llama-3.2-3b-instruct:free';
        const url = apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${trimmedKey}`,
            'HTTP-Referer': 'https://mycommercia.vercel.app',
            'X-Title': 'COMMERCIA SuperAdmin',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: 'Say PING_OK' }],
            max_tokens: 10,
          }),
        });

        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          return { success: false, latencyMs, provider: 'openrouter', model: selectedModel, error: errMsg };
        }

        const data: any = await res.json();
        return {
          success: true,
          latencyMs,
          provider: 'openrouter',
          model: selectedModel,
          responseSample: data?.choices?.[0]?.message?.content?.trim() || 'OK',
          tokenCount: data?.usage?.total_tokens || 5,
        };
      }

      default:
        return {
          success: false,
          latencyMs: Date.now() - start,
          provider,
          model: model || 'custom',
          error: `Fournisseur '${provider}' non pris en charge pour le test direct.`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      provider,
      model: model || 'inconnu',
      error: error?.message || 'Erreur réseau ou délai d’attente dépassé.',
    };
  }
}
