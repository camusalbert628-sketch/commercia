import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  HandMetal,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface PageGuideBannerProps {
  pageId: string;
  title: string;
  subtitle: string;
  autoDomino: string[];
  manualActions: string[];
  concreteExample: string;
  guideSectionId?: string;
}

export const PageGuideBanner: React.FC<PageGuideBannerProps> = ({
  pageId,
  title,
  subtitle,
  autoDomino,
  manualActions,
  concreteExample,
  guideSectionId,
}) => {
  const navigate = useNavigate();
  const storageKey = `commercia_guide_collapsed_${pageId}`;

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch (_) {
      return false;
    }
  });

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch (_) {}
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
        border: '1.5px solid #BFDBFE',
        borderRadius: '14px',
        marginBottom: '20px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 98, 255, 0.05)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header bar always visible */}
      <div
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(239, 246, 255, 0.7)',
          borderBottom: collapsed ? 'none' : '1px solid #DBEAFE',
          cursor: 'pointer',
        }}
        onClick={toggleCollapse}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#0062FF',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Info size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                Mode d'emploi : {title}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  background: '#DBEAFE',
                  color: '#1D4ED8',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                EFFET DOMINO ACTIF
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              {subtitle}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(guideSectionId ? `/guide#${guideSectionId}` : '/guide');
            }}
            className="btn btn-secondary"
            style={{
              padding: '5px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
            }}
            title="Consulter le guide complet détaillé"
          >
            <BookOpen size={13} color="#0062FF" />
            <span>Guide Complet</span>
          </button>

          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <span>{collapsed ? 'Afficher les explications' : 'Réduire'}</span>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Explanatory Body */}
      {!collapsed && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Box 1 : Effet Domino Automatique */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                padding: '12px 14px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#059669',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  marginBottom: '8px',
                }}
              >
                <Zap size={16} color="#059669" />
                <span>CE QUI EST AUTOMATISÉ (EFFET DOMINO)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.80rem', color: '#334155', lineHeight: 1.5 }}>
                {autoDomino.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Box 2 : Ce qui reste Manuel (Votre Contrôle) */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                padding: '12px 14px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#D97706',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  marginBottom: '8px',
                }}
              >
                <HandMetal size={16} color="#D97706" />
                <span>CE QUI RESTE MANUEL (VOTRE CONTRÔLE)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.80rem', color: '#334155', lineHeight: 1.5 }}>
                {manualActions.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Concrete Real-life Example Banner */}
          <div
            style={{
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <Lightbulb size={18} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem', color: '#78350F', lineHeight: 1.45 }}>
              <strong style={{ color: '#92400E' }}>Exemple concret : </strong>
              {concreteExample}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
