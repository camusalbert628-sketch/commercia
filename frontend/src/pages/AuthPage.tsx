import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck, X, Camera, Upload, User as UserIcon, Sparkles, KeyRound, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { InternationalPhoneInput } from '../components/common/InternationalPhoneInput';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const notice = sessionStorage.getItem('commercia_inactivity_logout_notice');
      if (notice) {
        setInactivityNotice(notice);
        sessionStorage.removeItem('commercia_inactivity_logout_notice');
      }
    } catch (_) {}
  }, []);

  // Helper pour traiter et compresser la photo de profil sélectionnée
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionner sur un canvas pour optimiser la mémoire et le stockage
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(dataUrl);
          setError('');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Google OAuth prompt modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const oauthChallengeRef = useRef<{ state: string; nonce: string } | null>(null);
  const challengeFetchedAtRef = useRef<number>(0);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '210731042943-aaap4r2isg8upmn22qapoifnd15703tn.apps.googleusercontent.com';

  const refreshOAuthChallenge = useCallback(async (): Promise<{ state: string; nonce: string } | null> => {
    try {
      const res = await api.get<{ state: string; nonce: string }>('/auth/google/challenge');
      if (res?.state && res?.nonce) {
        oauthChallengeRef.current = { state: res.state, nonce: res.nonce };
        challengeFetchedAtRef.current = Date.now();
        renderGoogleButtons();
        return { state: res.state, nonce: res.nonce };
      }
    } catch (e) {
      console.warn('Challenge refresh warning:', e);
    }
    return null;
  }, []);

  // Récupère un challenge OAuth (state + nonce) côté serveur contre CSRF et rejeu
  useEffect(() => {
    refreshOAuthChallenge();
  }, [refreshOAuthChallenge]);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      const msg = 'Authentification Google incomplète : aucun jeton cryptographique (credential) n’a été reçu.';
      setGoogleError(msg);
      setError(msg);
      return;
    }

    try {
      setGoogleLoading(true);
      setLoading(true);
      setGoogleError('');
      setError('');

      // Envoi du véritable credential cryptographique Google + state/nonce au backend HTTPS
      const res = await api.post<any>('/auth/google', {
        credential: response.credential,
        state: oauthChallengeRef.current?.state,
        nonce: oauthChallengeRef.current?.nonce,
        redirectUri: window.location.origin,
      });

      setShowGoogleModal(false);
      login({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);

      if (!res.user.businesses || res.user.businesses.length === 0) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Échec de vérification cryptographique du jeton Google par le serveur.';
      setGoogleError(errMsg);
      setError(errMsg);
    } finally {
      setGoogleLoading(false);
      setLoading(false);
    }
  };

  const renderGoogleButtons = () => {
    if (typeof window === 'undefined') return false;
    const google = (window as any).google;
    if (!google?.accounts?.id) return false;

    try {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        nonce: oauthChallengeRef.current?.nonce,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Bouton officiel sur la page principale
      const mainBtnDiv = document.getElementById('googleMainGsiButton');
      if (mainBtnDiv) {
        mainBtnDiv.innerHTML = '';
        google.accounts.id.renderButton(mainBtnDiv, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: 416,
          text: isLogin ? 'signin_with' : 'signup_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }

      // Bouton officiel dans la modal Google
      const modalBtnDiv = document.getElementById('googleModalGsiButton');
      if (modalBtnDiv) {
        modalBtnDiv.innerHTML = '';
        google.accounts.id.renderButton(modalBtnDiv, {
          type: 'standard',
          theme: 'filled_blue',
          size: 'large',
          width: 380,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }

      return true;
    } catch (err) {
      console.warn('GSI render notice:', err);
      return false;
    }
  };

  // Chargement et initialisation robuste du SDK Google Identity Services
  useEffect(() => {
    if (renderGoogleButtons()) return;

    const interval = setInterval(() => {
      if (renderGoogleButtons()) {
        clearInterval(interval);
      }
    }, 250);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isLogin, showGoogleModal]);

  const triggerGoogleAuthWithHint = async (hintEmail?: string) => {
    setGoogleError('');
    setError('');
    const google = (window as any).google;

    if (!google?.accounts?.id) {
      setGoogleError('Le SDK Google officiel est en cours de chargement. Veuillez patienter un instant ou rafraîchir la page.');
      return;
    }

    // Si le challenge n'existe pas ou a plus de 5 minutes, le rafraîchir immédiatement
    if (!oauthChallengeRef.current || (Date.now() - challengeFetchedAtRef.current > 5 * 60 * 1000)) {
      await refreshOAuthChallenge();
    }

    try {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        nonce: oauthChallengeRef.current?.nonce,
        login_hint: hintEmail ? hintEmail.trim().toLowerCase() : undefined,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason?.() || 'non_affiche';
          console.warn('Google prompt not displayed:', reason);
          if (reason === 'opt_out_or_no_session') {
            setGoogleError('Aucune session Google active trouvée dans votre navigateur. Veuillez cliquer directement sur le bouton officiel Google ci-dessus pour vous identifier.');
          } else if (reason === 'origin_mismatch') {
            setGoogleError('Origine non autorisée : Assurez-vous que https://mycommercia.vercel.app est ajouté dans les Origines JavaScript autorisées de votre console Google Cloud.');
          } else {
            setGoogleError('Veuillez cliquer directement sur le bouton officiel Google ci-dessus pour vous connecter.');
          }
        }
      });
    } catch (err: any) {
      console.error('Erreur déclenchement Google prompt:', err);
      setGoogleError(err.message || 'Impossible d’initialiser l’authentification Google.');
    }
  };

  const handleGoogleSignInClick = () => {
    setError('');
    setGoogleError('');
    setShowGoogleModal(true);
    refreshOAuthChallenge();
    setTimeout(() => {
      renderGoogleButtons();
    }, 100);
  };

  const handleConfirmGoogleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = googleEmailInput.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setGoogleError('Veuillez entrer une adresse Google valide (ex: votre-nom@gmail.com).');
      return;
    }

    // Déclenche l'authentification Google réelle avec cet email comme hint (ZÉRO BYPASS SANS JETON CRYPTOGRAPHIQUE)
    await triggerGoogleAuthWithHint(trimmed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && !avatarUrl) {
      setError('La photo de profil est obligatoire pour créer votre compte COMMERCIA. Veuillez importer une photo.');
      return;
    }

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
          avatarUrl: avatarUrl,
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

          {/* Official Google Sign-In Container */}
          <div style={{ marginBottom: '18px' }}>
            <div id="googleMainGsiButton" style={{ width: '100%', minHeight: '44px', display: 'flex', justifyContent: 'center' }}></div>
            
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
                marginTop: '8px',
              }}
            >
              {/* Google Logo SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>{isLogin ? 'Sélectionner un compte Google' : "S'inscrire avec Google"}</span>
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ou avec email vérifié
            </span>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          </div>

          {inactivityNotice && (
            <div
              style={{
                padding: '12px 16px',
                background: '#FEF3C7',
                color: '#92400E',
                borderRadius: '10px',
                marginBottom: '18px',
                fontSize: '0.88rem',
                fontWeight: 600,
                border: '1px solid #FCD34D',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ShieldAlert size={18} color="#D97706" style={{ flexShrink: 0 }} />
              <span>{inactivityNotice}</span>
            </div>
          )}

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
                {/* Photo de profil - Upload & Suggestions */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px dashed #CBD5E1',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Aperçu photo"
                        style={{
                          width: '76px',
                          height: '76px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #0062FF',
                          boxShadow: '0 4px 12px rgba(0, 98, 255, 0.25)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '76px',
                          height: '76px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                          border: '2px dashed #93C5FD',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0062FF',
                        }}
                      >
                        <UserIcon size={34} />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Ajouter ou changer la photo"
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        background: '#0062FF',
                        color: '#FFFFFF',
                        border: '2px solid #FFFFFF',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                    >
                      <Camera size={14} />
                    </button>
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span>Photo de profil du commerçant</span>
                      <span style={{ color: '#EF4444', fontSize: '0.9rem' }}>*</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: avatarUrl ? '#16A34A' : '#EF4444', fontWeight: 600, marginTop: '2px' }}>
                      {avatarUrl ? '✓ Photo sélectionnée avec succès' : 'Obligatoire • Insérée exclusivement à la création du compte'}
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-outline btn-sm"
                      style={{
                        fontSize: '0.76rem',
                        padding: '5px 12px',
                        borderColor: '#0062FF',
                        color: '#0062FF',
                        background: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Upload size={13} />
                      <span>{avatarUrl ? 'Changer de photo' : 'Importer une photo'}</span>
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '4px 8px',
                        }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Prénom *
                    </label>
                    <input
                      type="text"
                      placeholder="Votre prénom"
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

                <InternationalPhoneInput
                  value={phone}
                  onChange={(val) => setPhone(val)}
                  label="Téléphone (WhatsApp)"
                  placeholder="6XX XX XX XX"
                  enableOtpVerification={false}
                />
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

            {/* Quick 1-Click Detected Google Account */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#0062FF',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                  }}
                >
                  G
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.94rem' }}>
                    Authentification Google OpenID Connect
                  </div>
                  <div style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 600 }}>
                    Vérification cryptographique par jeton signé
                  </div>
                </div>
              </div>

              {/* Bouton officiel Google Identity Services dans la modal */}
              <div id="googleModalGsiButton" style={{ width: '100%', minHeight: '44px', display: 'flex', justifyContent: 'center' }}></div>

              <button
                type="button"
                onClick={() => triggerGoogleAuthWithHint()}
                disabled={googleLoading}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0062FF',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'none',
                }}
              >
                {googleLoading ? 'Connexion en cours...' : '⚡ Ouvrir le sélecteur de compte Google'}
                <ArrowRight size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ou utiliser un autre compte Google
              </span>
              <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            </div>

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
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Nom complet associé à Google (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Votre nom complet"
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
                  La saisie de cet email sélectionne votre compte. Google ouvrira son interface officielle pour valider cryptographiquement votre identité.
                </span>
              </div>

              <div
                style={{
                  background: '#EFF6FF',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.76rem',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>💡</span>
                <span>
                  <strong>Console Google Cloud :</strong> L'origine <code>https://mycommercia.vercel.app</code> doit être enregistrée dans les <strong>Origines JavaScript autorisées</strong> de votre Client ID OAuth Google.
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
