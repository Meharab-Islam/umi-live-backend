import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Radio,
  Users,
  Coins,
  Building2,
  Gift,
  Trophy,
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck,
  Shield,
  X,
  Mic,
  ShoppingBag,
  Crown,
  ChevronDown,
  ChevronRight,
  Plus,
  Image as ImageIcon,
  Sparkles,
  GalleryHorizontal,
  GitMerge,
  Terminal,
  Newspaper,
  ShieldAlert,
  Palette,
  Award,
  TrendingUp,
} from 'lucide-react';
import packageApi from '../api/packageApi';
import { useBranding } from '../context/BrandingContext';

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  activeStreamCount = 0,
  totalUsersCount = 0,
  isOpen = false,
  onClose,
}) {
  const [categories, setCategories] = useState([]);
  const [vipExpanded, setVipExpanded] = useState(false);
  const { brandName, resolvedLogoUrl } = useBranding();

  // Load VIP categories for sidebar navigation
  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      try {
        const res = await packageApi.getCategories();
        if (isMounted && res.success) {
          setCategories(res.categories || []);
        }
      } catch (err) {
        // silent fallback
      }
    };

    fetchCats();

    const handleCategoryUpdate = () => {
      fetchCats();
    };

    window.addEventListener('categories-updated', handleCategoryUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('categories-updated', handleCategoryUpdate);
    };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'streams', label: 'Live Streams', icon: Radio, badge: activeStreamCount > 0 ? `${activeStreamCount}` : null },
    { id: 'host-management', label: 'Hosts', icon: Mic },
    { id: 'live-rewards', label: 'Live Rewards', icon: Award },
    { id: 'levels', label: 'Levels', icon: TrendingUp },
    { id: 'agencies', label: 'Agencies', icon: Building2 },
    { id: 'resellers', label: 'Resellers', icon: ShoppingBag },
    { id: 'moderators', label: 'Moderators', icon: Shield },
    { id: 'users', label: 'Users', icon: Users, badge: totalUsersCount > 0 ? `${totalUsersCount}` : null },
    { id: 'reports', label: 'Reports', icon: ShieldAlert },
    { id: 'posts', label: 'Posts', icon: Newspaper },
    { id: 'account-merge', label: 'Account Merge', icon: GitMerge },
    // VIP Packages item handled specifically below
    { id: 'packages', label: 'VIP Packages', icon: Crown },
    { id: 'thumbnails', label: 'Thumbnails', icon: ImageIcon },
    { id: 'entry-effects', label: 'Entry Effects', icon: Sparkles },
    { id: 'banners', label: 'Banners', icon: GalleryHorizontal },
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'recharge', label: 'Coin Recharge', icon: Coins },
    { id: 'gifts', label: 'Gifts', icon: Gift },
    { id: 'top-contributors', label: 'Top Contributors', icon: Trophy },
    { id: 'withdrawals', label: 'Withdrawals', icon: CreditCard },
    { id: 'api-docs', label: 'API Docs', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="brand-section">
        <div className="brand-logo-badge" style={{ overflow: 'hidden', padding: resolvedLogoUrl ? 0 : undefined }}>
          {resolvedLogoUrl ? (
            <img
              src={resolvedLogoUrl}
              alt={brandName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                if (fallback) fallback.style.display = 'inline';
              }}
            />
          ) : null}
          <span className="fallback-icon" style={{ display: resolvedLogoUrl ? 'none' : 'inline' }}>⚡</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 className="brand-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={brandName}>
            {brandName}
          </h1>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>ADMIN CONSOLE</span>
        </div>
        <div className="brand-live-pill">
          <span className="pulsing-dot" />
          <span>v1.0</span>
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            className="mobile-close-sidebar-btn"
            onClick={onClose}
            title="Close Menu"
            type="button"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="nav-links">
        {menuItems.map((item) => {
          if (item.id === 'packages') {
            const isAnyVipActive = activeTab === 'packages' || activeTab.startsWith('vip-') || activeTab === 'create-category';

            return (
              <div key="vip-menu-group" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Clicking VIP Categories button directly toggles the dropdown */}
                <button
                  type="button"
                  className={`nav-item ${isAnyVipActive ? 'active' : ''}`}
                  onClick={() => {
                    const willExpand = !vipExpanded;
                    setVipExpanded(willExpand);
                    if (willExpand && categories.length > 0 && !activeTab.startsWith('vip-')) {
                      handleItemClick(`vip-${categories[0].id}`);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Crown size={18} />
                    <span>VIP Categories</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {categories.length > 0 && (
                      <span
                        className="nav-badge"
                        style={{
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: isAnyVipActive ? 'rgba(255,255,255,0.25)' : 'rgba(124, 58, 237, 0.1)',
                          color: isAnyVipActive ? '#fff' : '#7c3aed',
                          fontWeight: 700,
                        }}
                      >
                        {categories.length}
                      </span>
                    )}
                    <ChevronDown
                      size={15}
                      style={{
                        transform: vipExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                </button>

                {/* Dropdown list of Categories */}
                {vipExpanded && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      marginLeft: '1.25rem',
                      paddingLeft: '0.65rem',
                      borderLeft: '1.5px solid var(--border-color)',
                      marginRight: '0.5rem',
                      marginTop: '2px',
                      marginBottom: '4px',
                    }}
                  >
                    {/* Individual Category items (e.g. King, Duke, Knight) */}
                    {categories.map((cat) => {
                      const isCatActive = activeTab === `vip-${cat.id}`;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`nav-item sub-nav-item ${isCatActive ? 'active' : ''}`}
                          onClick={() => handleItemClick(`vip-${cat.id}`)}
                          style={{
                            fontSize: '0.82rem',
                            padding: '0.42rem 0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: isCatActive ? '#7c3aed' : 'var(--text-dim)',
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: isCatActive ? 700 : 500,
                              }}
                            >
                              {cat.name}
                            </span>
                          </div>

                          {cat.package_count > 0 && (
                            <span
                              className="nav-badge"
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                background: isCatActive ? 'rgba(255,255,255,0.25)' : 'rgba(124, 58, 237, 0.1)',
                                color: isCatActive ? '#fff' : '#7c3aed',
                                fontWeight: 700,
                              }}
                            >
                              {cat.package_count}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Quick + Create Category Button */}
                    <button
                      type="button"
                      className={`nav-item sub-nav-item ${activeTab === 'create-category' ? 'active' : ''}`}
                      onClick={() => handleItemClick('create-category')}
                      style={{
                        fontSize: '0.78rem',
                        padding: '0.4rem 0.65rem',
                        color: activeTab === 'create-category' ? '#fff' : '#7c3aed',
                        fontWeight: 700,
                        gap: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '8px',
                        marginTop: '2px',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} />
                      <span>+ Create Category</span>
                    </button>
                  </div>
                )}
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Admin Profile & Logout */}
      <div className="sidebar-footer">
        <div className="admin-profile-pill">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt="Admin"
            className="avatar-img"
          />
          <div>
            <div className="admin-name">{user?.full_name || 'Super Admin'}</div>
            <div className="admin-role">
              <ShieldCheck size={11} style={{ display: 'inline', marginRight: 3 }} />
              {user?.role || 'admin'}
            </div>
          </div>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onLogout}
          title="Sign out"
          style={{ padding: '0.4rem', borderRadius: '8px' }}
        >
          <LogOut size={16} color="#fda4af" />
        </button>
      </div>
    </aside>
  );
}
