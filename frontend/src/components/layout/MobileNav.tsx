import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Plus, Users, Menu } from 'lucide-react';
import { useModals } from '../../context/ModalContext';

interface MobileNavProps {
  onOpenQuickSale?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenQuickSale }) => {
  const { openQuickAction } = useModals();

  const handleActionClick = () => {
    if (onOpenQuickSale) {
      onOpenQuickSale();
    } else {
      openQuickAction();
    }
  };

  return (
    <nav className="mobile-nav">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
      >
        <LayoutDashboard size={20} />
        <span>Accueil</span>
      </NavLink>

      <NavLink
        to="/sales"
        className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
      >
        <ShoppingCart size={20} />
        <span>Ventes</span>
      </NavLink>

      {/* Floating Center Action Button with Quick Action Sheet */}
      <button
        className="mobile-action-btn"
        onClick={handleActionClick}
        title="Ajouter une opération"
      >
        <Plus size={24} />
      </button>

      <NavLink
        to="/customers"
        className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
      >
        <Users size={20} />
        <span>Crédits</span>
      </NavLink>

      <NavLink
        to="/analytics"
        className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
      >
        <Menu size={20} />
        <span>Plus</span>
      </NavLink>
    </nav>
  );
};
