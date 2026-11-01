import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode | string;
  badge?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  name?: string;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner une option...',
  disabled = false,
  className = '',
  style,
  name,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string, isDisabled?: boolean) => {
    if (isDisabled || disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Hidden input for form submits */}
      {name && <input type="hidden" name={name} value={value} id={id} />}

      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        style={{
          width: '100%',
          minHeight: '42px',
          padding: '9px 13px',
          borderRadius: '10px',
          border: isOpen ? '1.5px solid #0062FF' : '1px solid #CBD5E1',
          backgroundColor: disabled ? '#F8FAFC' : '#FFFFFF',
          color: disabled ? '#94A3B8' : '#0F172A',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(0, 98, 255, 0.16), 0 2px 8px rgba(0, 98, 255, 0.08)'
            : '0 1px 2px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption?.icon && (
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '1rem', flexShrink: 0 }}>
              {selectedOption.icon}
            </span>
          )}
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: selectedOption ? '#0F172A' : '#94A3B8' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isOpen ? '#0062FF' : '#64748B',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease',
            marginLeft: '8px',
            flexShrink: 0,
          }}
        >
          <ChevronDown size={16} />
        </div>
      </div>

      {/* Floating Unfolded Dropdown List */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 10000,
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 16px 36px -4px rgba(8, 22, 43, 0.18), 0 6px 16px rgba(0, 0, 0, 0.06)',
            padding: '6px',
            maxHeight: '260px',
            overflowY: 'auto',
            animation: 'dropdownUnfold 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            transformOrigin: 'top center',
            backdropFilter: 'blur(10px)',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value, opt.disabled)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  cursor: opt.disabled ? 'not-allowed' : 'pointer',
                  backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                  color: opt.disabled ? '#94A3B8' : isSelected ? '#0062FF' : '#1E293B',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.86rem',
                  transition: 'all 0.14s ease-out',
                  marginBottom: '2px',
                }}
                onMouseEnter={(e) => {
                  if (!opt.disabled && !isSelected) {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.color = '#0062FF';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!opt.disabled && !isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#1E293B';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.icon && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '1rem', flexShrink: 0 }}>
                      {opt.icon}
                    </span>
                  )}
                  <span>{opt.label}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {opt.badge && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#FEF3C7',
                        color: '#B45309',
                      }}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && <Check size={16} color="#0062FF" strokeWidth={2.5} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
