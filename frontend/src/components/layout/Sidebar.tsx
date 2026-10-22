import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingDown,
  Users,
  Package,
  BarChart3,
  Bot,
  Crown,
  ShieldAlert,
  LogOut,
  Wallet,
  TrendingUp,
  Landmark,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  debtCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ debtCount = 0, lowStockCount = 0 }) => {
  const { user, activeBusinessId, logout } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img
          src="/commercia-logo.png"
          alt="COMMERCIA"
          style={{
            width: '42px',
            height: '42px',
            objectFit: 'contain',
            borderRadius: '12px',
            background: '#FFFFFF',
            padding: '2px',
            boxShadow: '0 4px 14px rgba(0, 98, 255, 0.35)',
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', lineHeight: 1.2 }}>
              COMMERC<span style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IA</span>
            </span>
            <span className="brand-tag">PRO</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#60A5FA', fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }} title={activeBusiness?.name}>
            {activeBusiness?.name || 'Copilote Financier'}
          </div>
        </div>
      </div>

      <nav className="sidebar-menu">
        <div className="menu-category">Principal</div>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Tableau de bord</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <ShoppingCart size={18} />
          <span>Ventes</span>
        </NavLink>

        <NavLink
          to="/expenses"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <TrendingDown size={18} />
          <span>Dépenses</span>
        </NavLink>

        <NavLink
          to="/cash"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Wallet size={18} />
          <span>Caisse Journalière</span>
        </NavLink>

        <div className="menu-category">Gestion Commerciale</div>
        <NavLink
          to="/customers"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>Clients & Crédits</span>
          {debtCount > 0 && <span className="badge badge-danger">{debtCount}</span>}
        </NavLink>

        <NavLink
          to="/products"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Package size={18} />
          <span>Stock & Produits</span>
          {lowStockCount > 0 && <span className="badge badge-warning">{lowStockCount}</span>}
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={18} />
          <span>Statistiques & Rapport</span>
        </NavLink>

        <div className="menu-category">Modules Premium</div>
        <NavLink
          to="/growth"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <TrendingUp size={18} />
          <span>Croissance & CAC</span>
          <span style={{ fontSize: '0.65rem', background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
        </NavLink>

        <NavLink
          to="/treasury"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Landmark size={18} />
          <span>Trésorerie & Scénarios</span>
          <span style={{ fontSize: '0.65rem', background: '#10B981', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
        </NavLink>

        <div className="menu-category">Intelligence & Offres</div>
        <NavLink
          to="/copilot"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Bot size={18} />
          <span>Copilote IA COMMERCIA</span>
        </NavLink>

        <NavLink
          to="/subscription"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Crown size={18} />
          <span>Mon Abonnement</span>
        </NavLink>

        {user?.isAdmin && (
          <>
            <div className="menu-category">Administration</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ShieldAlert size={18} />
              <span>Admin SaaS</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-card">
          <div className="user-avatar">
            {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Commerçant'}
            </div>
            <div className="user-role" title={activeBusiness?.name}>
              {activeBusiness?.name || user?.subscription?.planDisplayName || 'Plan Gratuit'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Se déconnecter"
            style={{
              background: 'transparent',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
