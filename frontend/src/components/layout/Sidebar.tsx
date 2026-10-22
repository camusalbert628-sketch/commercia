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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  debtCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ debtCount = 0, lowStockCount = 0 }) => {
  const { user, logout } = useAuthStore();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-badge">RS</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="brand-title">RS-BIZZ</span>
            <span className="brand-tag">MVP</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Copilote Financier</div>
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

        <div className="menu-category">Intelligence & Offres</div>
        <NavLink
          to="/copilot"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Bot size={18} />
          <span>Copilote IA RS-BIZZ</span>
        </NavLink>

        <NavLink
          to="/plans"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Crown size={18} />
          <span>Abonnements</span>
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
              {user?.firstName} {user?.lastName}
            </div>
            <div className="user-role">
              {user?.subscription?.planDisplayName || 'Plan Gratuit'}
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
