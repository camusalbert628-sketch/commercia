import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  parsePhoneNumberFromString,
  AsYouType,
  CountryCode,
  getCountryCallingCode,
} from 'libphonenumber-js';
import {
  CheckCircle2,
  AlertCircle,
  Phone,
  Search,
  ChevronDown,
  ShieldCheck,
  Send,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';

export interface CountryInfo {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
}

export const POPULAR_COUNTRIES: CountryInfo[] = [
  { code: 'CM', name: 'Cameroun', callingCode: '+237', flag: '🇨🇲' },
  { code: 'CI', name: "Côte d'Ivoire", callingCode: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', callingCode: '+221', flag: '🇸🇳' },
  { code: 'TG', name: 'Togo', callingCode: '+228', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', callingCode: '+229', flag: '🇧🇯' },
  { code: 'GA', name: 'Gabon', callingCode: '+241', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo', callingCode: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'RDC', callingCode: '+243', flag: '🇨🇩' },
  { code: 'ML', name: 'Mali', callingCode: '+223', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', callingCode: '+226', flag: '🇧🇫' },
  { code: 'GN', name: 'Guinée', callingCode: '+224', flag: '🇬🇳' },
  { code: 'NE', name: 'Niger', callingCode: '+227', flag: '🇳🇪' },
  { code: 'TD', name: 'Tchad', callingCode: '+235', flag: '🇹🇩' },
  { code: 'FR', name: 'France', callingCode: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', callingCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', callingCode: '+41', flag: '🇨🇭' },
  { code: 'CA', name: 'Canada', callingCode: '+1', flag: '🇨🇦' },
  { code: 'US', name: 'États-Unis', callingCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', callingCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne', callingCode: '+49', flag: '🇩🇪' },
  { code: 'AE', name: 'Émirats Arabes Unis', callingCode: '+971', flag: '🇦🇪' },
  { code: 'MA', name: 'Maroc', callingCode: '+212', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisie', callingCode: '+216', flag: '🇹🇳' },
  { code: 'DZ', name: 'Algérie', callingCode: '+213', flag: '🇩🇿' },
];

export interface InternationalPhoneValue {
  e164: string;
  nationalNumber: string;
  country: CountryCode;
  callingCode: string;
  isValid: boolean;
  isVerified?: boolean;
}

export interface InternationalPhoneInputProps {
  value?: string;
  defaultValue?: string;
  defaultCountry?: CountryCode;
  onChange?: (val: string, details?: InternationalPhoneValue) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  isVerified?: boolean;
  enableOtpVerification?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value: propValue,
  defaultCountry = 'CM',
  onChange,
  label = 'Numéro de téléphone',
  placeholder = '6XX XX XX XX',
  required = false,
  disabled = false,
  isVerified: propVerified = false,
  enableOtpVerification = false,
  className = '',
  style,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(() => {
    const found = POPULAR_COUNTRIES.find((c) => c.code === defaultCountry);
    return found || POPULAR_COUNTRIES[0];
  });

  const [nationalInput, setNationalInput] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verifiedState, setVerifiedState] = useState<boolean>(propVerified);

  // Modal OTP states
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialisation ou synchronisation si propValue change
  useEffect(() => {
    if (propValue !== undefined) {
      if (!propValue) {
        setNationalInput('');
        return;
      }

      // Parser le numéro E.164 existant
      const parsed = parsePhoneNumberFromString(propValue);
      if (parsed) {
        const countryMatch = POPULAR_COUNTRIES.find((c) => c.code === parsed.country);
        if (countryMatch) {
          setSelectedCountry(countryMatch);
        }
        setNationalInput(parsed.nationalNumber);
      } else {
        // Enlève l'indicatif si présent
        const clean = propValue.replace(/^\+/, '');
        setNationalInput(clean);
      }
    }
  }, [propValue]);

  useEffect(() => {
    setVerifiedState(propVerified);
  }, [propVerified]);

  // Fermer la liste déroulante au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrer les pays selon recherche
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_COUNTRIES;
    const q = searchQuery.toLowerCase().trim();
    return POPULAR_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.callingCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Validation dynamique E.164
  const phoneValidation = useMemo(() => {
    if (!nationalInput.trim()) {
      return { isValid: false, formatted: '', e164: '', nationalNumber: '' };
    }

    try {
      const fullNumber = `${selectedCountry.callingCode}${nationalInput.replace(/\D/g, '')}`;
      const parsed = parsePhoneNumberFromString(fullNumber, selectedCountry.code);
      if (parsed && parsed.isValid()) {
        return {
          isValid: true,
          formatted: parsed.formatNational(),
          e164: parsed.number,
          nationalNumber: parsed.nationalNumber,
        };
      }
    } catch (_) {}

    return {
      isValid: false,
      formatted: nationalInput,
      e164: `${selectedCountry.callingCode}${nationalInput.replace(/\D/g, '')}`,
      nationalNumber: nationalInput.replace(/\D/g, ''),
    };
  }, [nationalInput, selectedCountry]);

  // Formatter à la saisie ("As You Type")
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatter = new AsYouType(selectedCountry.code);
    const formatted = formatter.input(rawVal);

    // Récupérer uniquement les chiffres pour le nationalInput
    const cleanNational = rawVal.replace(/\D/g, '');
    setNationalInput(cleanNational);
    setVerifiedState(false);

    const fullNumber = `${selectedCountry.callingCode}${cleanNational}`;
    const parsed = parsePhoneNumberFromString(fullNumber, selectedCountry.code);
    const valid = !!(parsed && parsed.isValid());

    if (onChange) {
      const e164Value = valid && parsed ? parsed.number : fullNumber;
      onChange(e164Value, {
        e164: e164Value,
        nationalNumber: cleanNational,
        country: selectedCountry.code,
        callingCode: selectedCountry.callingCode,
        isValid: valid,
        isVerified: false,
      });
    }
  };

  const handleCountrySelect = (c: CountryInfo) => {
    setSelectedCountry(c);
    setDropdownOpen(false);
    setSearchQuery('');
    setVerifiedState(false);

    if (nationalInput && onChange) {
      const fullNumber = `${c.callingCode}${nationalInput.replace(/\D/g, '')}`;
      const parsed = parsePhoneNumberFromString(fullNumber, c.code);
      const valid = !!(parsed && parsed.isValid());
      const e164Value = valid && parsed ? parsed.number : fullNumber;
      onChange(e164Value, {
        e164: e164Value,
        nationalNumber: nationalInput,
        country: c.code,
        callingCode: c.callingCode,
        isValid: valid,
        isVerified: false,
      });
    }
    inputRef.current?.focus();
  };

  // Envoi OTP SMS
  const handleSendOtp = async () => {
    if (!phoneValidation.isValid) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      await api.post('/phone/send-otp', {
        phoneNumber: phoneValidation.e164,
        country: selectedCountry.code,
      });
      setShowOtpModal(true);
    } catch (err: any) {
      setOtpError(err?.message || "Impossible d'envoyer le code SMS.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Vérification OTP SMS
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await api.post<{ success: boolean; verified: boolean }>('/phone/verify-otp', {
        phoneNumber: phoneValidation.e164,
        code: otpCode,
      });
      if (res.verified) {
        setVerifiedState(true);
        setOtpSuccess(true);
        setTimeout(() => {
          setShowOtpModal(false);
          setOtpSuccess(false);
          setOtpCode('');
        }, 1200);

        if (onChange) {
          onChange(phoneValidation.e164, {
            e164: phoneValidation.e164,
            nationalNumber: phoneValidation.nationalNumber,
            country: selectedCountry.code,
            callingCode: selectedCountry.callingCode,
            isValid: true,
            isVerified: true,
          });
        }
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Code SMS incorrect ou expiré.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`international-phone-field ${className}`}
      style={{ position: 'relative', width: '100%', marginBottom: '16px', ...style }}
    >
      {label && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#334155',
            marginBottom: '6px',
          }}
        >
          <span>
            {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
          </span>

          {/* Badge d'état du numéro */}
          {nationalInput.length > 0 && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: verifiedState
                  ? 'rgba(16, 185, 129, 0.12)'
                  : phoneValidation.isValid
                  ? 'rgba(0, 98, 255, 0.1)'
                  : 'rgba(239, 68, 68, 0.12)',
                color: verifiedState
                  ? '#059669'
                  : phoneValidation.isValid
                  ? '#0062FF'
                  : '#DC2626',
              }}
            >
              {verifiedState ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>Vérifié</span>
                </>
              ) : phoneValidation.isValid ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>Format E.164 Valide</span>
                </>
              ) : (
                <>
                  <AlertCircle size={12} />
                  <span>Format Invalide</span>
                </>
              )}
            </span>
          )}
        </label>
      )}

      {/* Input container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: '12px',
          border: verifiedState
            ? '1.5px solid #10B981'
            : phoneValidation.isValid
            ? '1.5px solid #0062FF'
            : nationalInput
            ? '1.5px solid #EF4444'
            : '1.5px solid #CBD5E1',
          background: '#FFFFFF',
          overflow: 'visible',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Sélecteur de pays */}
        <button
          type="button"
          onClick={() => !disabled && setDropdownOpen(!dropdownOpen)}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 12px',
            background: '#F8FAFC',
            border: 'none',
            borderRight: '1px solid #E2E8F0',
            borderTopLeftRadius: '11px',
            borderBottomLeftRadius: '11px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#1E293B',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>{selectedCountry.flag}</span>
          <span>{selectedCountry.callingCode}</span>
          <ChevronDown size={14} color="#64748B" />
        </button>

        {/* Champ de saisie du numéro national */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            value={nationalInput}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              outline: 'none',
              fontSize: '0.94rem',
              color: '#0F172A',
              fontWeight: 600,
              background: 'transparent',
            }}
          />

          {/* Bouton de vérification OTP si activé */}
          {enableOtpVerification && phoneValidation.isValid && !verifiedState && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpLoading}
              title="Vérifier le numéro par SMS"
              style={{
                marginRight: '8px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                background: '#0062FF',
                color: '#FFFFFF',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              <ShieldCheck size={13} />
              <span>{otpLoading ? 'Envoi...' : 'Vérifier'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Menu déroulant de sélection internationale */}
      {dropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '320px',
            maxHeight: '290px',
            background: '#FFFFFF',
            borderRadius: '14px',
            boxShadow: '0 15px 35px -5px rgba(0,0,0,0.2), 0 0 1px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Recherche de pays */}
          <div style={{ padding: '8px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
              }}
            >
              <Search size={14} color="#94A3B8" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher pays ou indicatif..."
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Liste déroulante */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filteredCountries.map((c) => {
              const isSelected = c.code === selectedCountry.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: 'none',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(0, 98, 255, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    textAlign: 'left',
                    color: isSelected ? '#0062FF' : '#1E293B',
                    fontWeight: isSelected ? 700 : 500,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{c.flag}</span>
                    <span>{c.name}</span>
                  </div>
                  <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 700 }}>
                    {c.callingCode}
                  </span>
                </button>
              );
            })}
            {filteredCountries.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
                Aucun pays trouvé
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de vérification OTP par SMS */}
      {showOtpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              padding: '28px 24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowOtpModal(false)}
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
              <X size={16} />
            </button>

            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(0, 98, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#0062FF',
              }}
            >
              <ShieldCheck size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              Vérification du Numéro
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 18px 0' }}>
              Un code de confirmation a été envoyé par SMS au{' '}
              <strong style={{ color: '#0F172A' }}>{phoneValidation.e164}</strong>.
            </p>

            {otpError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '10px',
                  padding: '10px',
                  color: '#DC2626',
                  fontSize: '0.8rem',
                  marginBottom: '14px',
                  fontWeight: 600,
                }}
              >
                {otpError}
              </div>
            )}

            {otpSuccess ? (
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '12px',
                  color: '#059669',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                }}
              >
                ✓ Numéro vérifié avec succès !
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Code à 6 chiffres"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid #CBD5E1',
                    fontSize: '1.4rem',
                    textAlign: 'center',
                    fontWeight: 800,
                    letterSpacing: '0.25em',
                    outline: 'none',
                    marginBottom: '16px',
                  }}
                  autoFocus
                />

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otpCode.length < 4}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: '#0062FF',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: otpLoading || otpCode.length < 4 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 18px rgba(0, 98, 255, 0.3)',
                  }}
                >
                  {otpLoading ? 'Vérification...' : 'Confirmer le code'}
                </button>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '12px',
                  }}
                >
                  Renvoyer un code
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
