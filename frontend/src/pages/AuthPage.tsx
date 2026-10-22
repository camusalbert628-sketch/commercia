import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Store, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post<any>('/auth/login', { email, password });
        login({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);
        
        // If user has no businesses, take to onboarding
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
  };

  const fillDemoAdmin = () => {
    setIsLogin(true);
    setEmail('admin@rsbizz.com');
    setPassword('admin1234');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #064E3B 0%, #0F172A 100%)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            padding: '36px 32px 28px',
            color: '#FFFFFF',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Store size={28} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '1.75rem', color: '#FFFFFF', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            RS-BIZZ
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#D1FAE5', margin: 0 }}>
            Le copilote financier des entrepreneurs africains
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
              padding: '6px 12px',
              borderRadius: '20px',
              background: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
            }}
          >
            👉 Démo Commerçant (Moussa)
          </button>
          <button
            type="button"
            onClick={fillDemoAdmin}
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '20px',
              background: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
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
              marginBottom: '24px',
            }}
          >
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                background: isLogin ? '#FFFFFF' : 'transparent',
                color: isLogin ? '#0F172A' : '#64748B',
                boxShadow: isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                background: !isLogin ? '#FFFFFF' : 'transparent',
                color: !isLogin ? '#0F172A' : '#64748B',
                boxShadow: !isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Inscription gratuite
            </button>
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
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
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
              <CheckCircle2 size={16} color="#059669" />
              <span>100% Hors-Ligne</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>Devise FCFA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>Sécurisé</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
