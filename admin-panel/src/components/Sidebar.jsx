import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  PhoneCall,
  Server,
  Camera,
  Star,
  UserX,
  FileText,
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
  const [searchQuery, setSearchQuery] = useState('');
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

  const menuSections = useMemo(
    () => [
      {
        title: 'Overview',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'streams', label: 'Live Streams', icon: Radio, badge: activeStreamCount > 0 ? `${activeStreamCount}` : null },
        ],
      },
      {
        title: 'Talent & Creators',
        items: [
          { id: 'host-management', label: 'Hosts', icon: Mic },
          { id: 'agencies', label: 'Agencies', icon: Building2 },
          { id: 'live-rewards', label: 'Live Rewards', icon: Award },
        ],
      },
      {
        title: 'Users & Safety',
        items: [
          { id: 'users', label: 'Users', icon: Users, badge: totalUsersCount > 0 ? `${totalUsersCount}` : null },
          { id: 'deletion-requests', label: 'Deletion Requests', icon: UserX },
          { id: 'moderators', label: 'Moderators', icon: Shield },
          { id: 'reports', label: 'Reports', icon: ShieldAlert },
          { id: 'posts', label: 'Posts', icon: Newspaper },
          { id: 'levels', label: 'Levels', icon: TrendingUp },
          { id: 'account-merge', label: 'Account Merge', icon: GitMerge },
        ],
      },
      {
        title: 'Economy & Monetization',
        items: [
          { id: 'recharge', label: 'Coin Recharge', icon: Coins },
          { id: 'withdrawals', label: 'Withdrawals', icon: CreditCard },
          { id: 'gifts', label: 'Gifts', icon: Gift },
          { id: 'top-contributors', label: 'Top Contributors', icon: Trophy },
          { id: 'resellers', label: 'Resellers', icon: ShoppingBag },
        ],
      },
      {
        title: 'Store & Appearance',
        items: [
          { id: 'packages', label: 'VIP Packages', icon: Crown },
          { id: 'thumbnails', label: 'Thumbnails', icon: ImageIcon },
          { id: 'entry-effects', label: 'Entry Effects', icon: Sparkles },
          { id: 'banners', label: 'Banners', icon: GalleryHorizontal },
          { id: 'themes', label: 'Themes', icon: Palette },
        ],
      },
      {
        title: 'App Configuration',
        items: [
          { id: 'app-economy', label: 'Economy Config', icon: Coins },
          { id: 'call-config', label: '1-to-1 Calls', icon: PhoneCall },
          { id: 'livekit-config', label: 'LiveKit WebRTC', icon: Server },
          { id: 'screen-guard', label: 'Screen Guard', icon: Camera },
          { id: 'star-system', label: 'Star System', icon: Star },
          { id: 'wallpaper-pricing', label: 'Wallpaper Pricing', icon: ImageIcon },
        ],
      },
      {
        title: 'System & Security',
        items: [
          { id: 'legal-policies', label: 'Privacy & Policies', icon: FileText },
          { id: 'api-docs', label: 'API Docs', icon: Terminal },
          { id: 'settings', label: 'Admin Settings', icon: Settings },
        ],
      },
    ],
    [activeStreamCount, totalUsersCount]
  );

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  // Filter sections if search input has query
  const query = searchQuery.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!query) return menuSections;
    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.label.toLowerCase().includes(query)) return true;
          if (item.id === 'packages') {
            // Also search inside category names
            return categories.some((c) => c.name?.toLowerCase().includes(query));
          }
          return false;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSections, query, categories]);

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
          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.04em' }}>ADMIN CONSOLE</span>
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

      {/* Quick Search Jump */}
      <div className="sidebar-search-box" style={{ padding: '0 0.25rem 0.65rem 0.25rem' }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            padding: '0.35rem 0.65rem',
            transition: 'border-color 0.2s',
          }}
        >
          <Search size={14} style={{ color: 'var(--text-dim)', marginRight: '6px', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.78rem',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-dim)',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="nav-links">
        {filteredSections.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            No matching menu items
          </div>
        ) : (
          filteredSections.map((section, sIndex) => (
            <div key={section.title || sIndex} className="nav-section-group" style={{ marginBottom: '0.45rem' }}>
              <div
                className="nav-section-title"
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0.4rem 0.85rem 0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  userSelect: 'none',
                }}
              >
                <span>{section.title}</span>
              </div>

              {section.items.map((item) => {
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
                          <Crown size={17} />
                          <span>VIP Packages</span>
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
                            size={14}
                            style={{
                              transform: vipExpanded || query ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </div>
                      </button>

                      {/* Dropdown list of Categories */}
                      {(vipExpanded || query) && (
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
                          {categories.map((cat) => {
                            const isCatActive = activeTab === `vip-${cat.id}`;

                            return (
                              <button
                                key={cat.id}
                                type="button"
                                className={`nav-item sub-nav-item ${isCatActive ? 'active' : ''}`}
                                onClick={() => handleItemClick(`vip-${cat.id}`)}
                                style={{
                                  fontSize: '0.8rem',
                                  padding: '0.38rem 0.65rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderRadius: '8px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                  <span
                                    style={{
                                      width: '7px',
                                      height: '7px',
                                      borderRadius: '50%',
                                      background: cat.color_code || (isCatActive ? '#7c3aed' : 'var(--text-dim)'),
                                      boxShadow: isCatActive ? `0 0 6px ${cat.color_code || '#7c3aed'}` : 'none',
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
                                      fontSize: '0.65rem',
                                      padding: '1px 5px',
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
                              fontSize: '0.76rem',
                              padding: '0.35rem 0.65rem',
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
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </nav>

      {/* Admin Profile & Logout */}
      <div className="sidebar-footer">
        <div
          className="admin-profile-pill"
          onClick={() => onNavigate && onNavigate('settings')}
          title="Click to view & edit Super Admin profile"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
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
