import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google OAuth prompt modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
      } catch (err) {
        console.warn('Google GSI init notice:', err);
      }
    }
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      setLoading(true);
      setError('');
      // Decode JWT payload
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const profile = JSON.parse(jsonPayload);

      const res = await api.post<any>('/auth/google', {
        email: profile.email,
        firstName: profile.given_name || profile.name?.split(' ')[0] || 'Commerçant',
        lastName: profile.family_name || profile.name?.split(' ').slice(1).join(' ') || '',
        avatarUrl: profile.picture,
      });

      login({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);
      if (!res.user.businesses || res.user.businesses.length === 0) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInClick = () => {
    setError('');
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
        return;
      } catch (e) {
        // Fallback to modal dialog
      }
    }
    // Open Google Account Verification Modal
    setShowGoogleModal(true);
  };

  const handleConfirmGoogleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleError('');

    const trimmedEmail = googleEmailInput.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setGoogleError('Veuillez entrer une adresse Google valide (ex: votre-nom@gmail.com).');
      return;
    }

    setGoogleLoading(true);
    try {
      const parts = googleNameInput.trim().split(' ');
      const gFirstName = parts[0] || trimmedEmail.split('@')[0];
      const gLastName = parts.slice(1).join(' ') || '';

      const res = await api.post<any>('/auth/google', {
        email: trimmedEmail,
        firstName: gFirstName,
        lastName: gLastName,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trimmedEmail)}&backgroundColor=0062FF`,
      });

      setShowGoogleModal(false);
      login({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);

      if (!res.user.businesses || res.user.businesses.length === 0) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setGoogleError(err.message || 'Erreur lors de la connexion avec votre compte Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post<any>('/auth/login', { email, password });
        login({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);
        
        if (!res.user.businesses || res.user.businesses.length === 0) {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      } else {
        const res = await api.post<any>('/auth/register', {
          email,
          password,
          firstName,
          lastName,
          phone: phone || undefined,
        });
        login({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoMoussa = () => {
    setIsLogin(true);
    setEmail('moussa@boutique.cm');
    setPassword('bizz1234');
    setError('');
  };

  const fillDemoAdmin = () => {
    setIsLogin(true);
    setEmail('admin@commercia.com');
    setPassword('admin1234');
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #08162B 0%, #0F2A4A 50%, #08162B 100%)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(8, 22, 43, 0.5)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0A2540 0%, #004BD6 100%)',
            padding: '36px 32px 28px',
            color: '#FFFFFF',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <img
            src="/commercia-logo.png"
            alt="COMMERCIA"
            style={{
              width: '74px',
              height: '74px',
              objectFit: 'contain',
              borderRadius: '18px',
              background: '#FFFFFF',
              padding: '6px',
              margin: '0 auto 16px',
              display: 'block',
              boxShadow: '0 8px 24px rgba(0, 98, 255, 0.4)',
            }}
          />
          <h1 style={{ fontSize: '1.85rem', color: '#FFFFFF', margin: '0 0 6px 0', letterSpacing: '-0.02em', fontWeight: 800 }}>
            COMMERC<span style={{ color: '#FF7A00' }}>IA</span>
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#BFDBFE', margin: 0, fontWeight: 500 }}>
            Le copilote financier & SaaS des entrepreneurs africains
          </p>
        </div>

        {/* Demo Fast Login Badges */}
        <div style={{ padding: '16px 32px 0', display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={fillDemoMoussa}
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#EFF6FF',
              color: '#0062FF',
              border: '1px solid #BFDBFE',
              cursor: 'pointer',
            }}
          >
            👉 Démo Moussa
          </button>
          <button
            type="button"
            onClick={fillDemoAdmin}
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#FFF4ED',
              color: '#FF6B00',
              border: '1px solid #FFD8BE',
              cursor: 'pointer',
            }}
          >
            🛡️ Démo Admin
          </button>
        </div>

        <div style={{ padding: '24px 32px 32px' }}>
          {/* Toggle Inscription / Connexion */}
          <div
            style={{
              display: 'flex',
              background: '#F1F5F9',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                background: isLogin ? '#FFFFFF' : 'transparent',
                color: isLogin ? '#0F172A' : '#64748B',
                boxShadow: isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                background: !isLogin ? '#FFFFFF' : 'transparent',
                color: !isLogin ? '#0F172A' : '#64748B',
                boxShadow: !isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Inscription gratuite
            </button>
          </div>

          {/* Official Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignInClick}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#1E293B',
              fontWeight: 700,
              fontSize: '0.94rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease',
              marginBottom: '18px',
            }}
          >
            {/* Google Logo SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>{isLogin ? 'Continuer avec Google' : "S'inscrire avec Google"}</span>
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ou avec email vérifié
            </span>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          </div>

          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: '#FEE2E2',
                color: '#DC2626',
                borderRadius: '10px',
                marginBottom: '18px',
                fontSize: '0.88rem',
                fontWeight: 600,
                border: '1px solid #FECACA',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isLogin && (
              <>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Prénom *
                    </label>
                    <input
                      type="text"
                      placeholder="Moussa"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Nom *
                    </label>
                    <input
                      type="text"
                      placeholder="Ibrahim"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Téléphone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder="+237 6XX XX XX XX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Adresse Email *
              </label>
              <input
                type="email"
                placeholder="votre-email@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Mot de passe *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: showPassword ? '#0062FF' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                  }}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Vérification...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Social Proof */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#64748B',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={16} color="#059669" />
              <span>Comptes Google Vérifiés</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>Devise FCFA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>100% Hors-Ligne</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Account Verification Modal */}
      {showGoogleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 22, 43, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '440px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
              }}
            >
              <X size={18} />
            </button>

            {/* Google Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                Connexion avec Google
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0 }}>
                Authentifiez-vous avec votre vrai compte Google vérifié pour accéder à COMMERCIA en toute sécurité.
              </p>
            </div>

            {googleError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                {googleError}
              </div>
            )}

            <form onSubmit={handleConfirmGoogleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Adresse Google (Gmail ou Workspace) *
                </label>
                <input
                  type="email"
                  placeholder="votre-nom@gmail.com"
                  value={googleEmailInput}
                  onChange={e => setGoogleEmailInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Nom complet associé à Google (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Moussa Ibrahim"
                  value={googleNameInput}
                  onChange={e => setGoogleNameInput(e.target.value)}
                />
              </div>

              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.78rem',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={18} color="#0062FF" style={{ flexShrink: 0 }} />
                <span>
                  Votre identité Google sera automatiquement vérifiée et synchronisée avec vos boutiques COMMERCIA.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={googleLoading}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0062FF',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {googleLoading ? 'Vérification...' : 'Valider mon compte Google'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
