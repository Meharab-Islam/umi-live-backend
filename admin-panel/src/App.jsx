import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveStreams from './pages/LiveStreams';
import Users from './pages/Users';
import Gifts from './pages/Gifts';
import Withdrawals from './pages/Withdrawals';
import Settings from './pages/Settings';
import Agencies from './pages/Agencies';
import Moderators from './pages/Moderators';
import CoinRecharge from './pages/CoinRecharge';
import HostManagement from './pages/HostManagement';
import Resellers from './pages/Resellers';
import PackageManagement from './pages/PackageManagement';
import CreateCategory from './pages/CreateCategory';
import Thumbnails from './pages/Thumbnails';
import EntryEffects from './pages/EntryEffects';
import SpecialItems from './pages/SpecialItems';
import Banners from './pages/Banners';
import AccountMerge from './pages/AccountMerge';
import ApiDocs from './pages/ApiDocs';
import TopContributors from './pages/TopContributors';
import Posts from './pages/Posts';
import Reports from './pages/Reports';
import AppThemes from './pages/AppThemes';
import LiveRewards from './pages/LiveRewards';
import Levels from './pages/Levels';

import { checkHealth, getToken, setToken, getCurrentUser, setCurrentUser } from './api/client';
import dashboardApi from './api/dashboardApi';
import streamApi from './api/streamApi';
import Loader from './components/Loader';
import ErrorBoundary from './components/ErrorBoundary';

const VALID_TABS = [
  'dashboard',
  'streams',
  'host-management',
  'live-rewards',
  'levels',
  'agencies',
  'resellers',
  'moderators',
  'users',
  'reports',
  'posts',
  'account-merge',
  'packages',
  'create-category',
  'thumbnails',
  'entry-effects',
  'special-items',
  'banners',
  'themes',
  'recharge',
  'gifts',
  'top-contributors',
  'withdrawals',
  'app-economy',
  'call-config',
  'livekit-config',
  'screen-guard',
  'star-system',
  'wallpaper-pricing',
  'api-docs',
  'settings',
];

const isTabValid = (tab) => {
  if (!tab) return false;
  return VALID_TABS.includes(tab) || tab.startsWith('vip-');
};

const normalizeTab = (tab) => {
  return tab;
};

const getInitialTab = () => {
  // 1. Check window.location.hash (e.g. #portal, #live, #users or #vip-1)
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (isTabValid(hash)) return normalizeTab(hash);

  // 2. Check pathname (e.g. /portal, /live, /users)
  const path = window.location.pathname.replace(/^\//, '').split('/')[0].trim().toLowerCase();
  if (isTabValid(path)) return normalizeTab(path);

  // 3. Check localStorage
  const saved = localStorage.getItem('admin_active_tab');
  if (saved && isTabValid(saved)) return normalizeTab(saved);

  return 'dashboard';
};

export default function App() {
  const [user, setUser] = useState(getCurrentUser());
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync tab with URL hash, history and localStorage
  const handleTabChange = (tab) => {
    if (!isTabValid(tab)) return;
    const finalTab = normalizeTab(tab);
    setActiveTab(finalTab);
    setMobileMenuOpen(false);
    localStorage.setItem('admin_active_tab', finalTab);
    if (window.location.hash !== `#${finalTab}`) {
      window.history.pushState(null, '', `#${finalTab}`);
    }
  };

  useEffect(() => {
    const syncFromUrl = () => {
      const tab = getInitialTab();
      setActiveTab((prev) => (prev !== tab ? tab : prev));
    };

    window.addEventListener('hashchange', syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);

    // Ensure the initial tab is reflected in the URL hash
    if (!window.location.hash && activeTab) {
      window.history.replaceState(null, '', `#${activeTab}`);
    }

    return () => {
      window.removeEventListener('hashchange', syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUser(getCurrentUser());
    };
    const handleAuthExpired = (e) => {
      setUser(null);
      if (e?.detail) {
        addToast(e.detail, 'error');
      }
    };
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    window.addEventListener('admin_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
      window.removeEventListener('admin_auth_expired', handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    if (activeTab && isTabValid(activeTab)) {
      localStorage.setItem('admin_active_tab', activeTab);
    }
  }, [activeTab]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const checkConnection = async () => {
    const health = await checkHealth();
    setIsConnected(health.status === 'ok');
  };

  const fetchStats = async () => {
    if (!getToken()) return;
    try {
      setIsRefreshing(true);
      const res = await dashboardApi.getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Stats fetch issue:', err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    addToast(`Welcome back, ${loggedInUser.full_name || 'Admin'}!`, 'success');
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    setUser(null);
    addToast('Signed out of admin console.', 'info');
  };

  const handleTerminateStream = async (roomId) => {
    try {
      const res = await streamApi.terminateStream(roomId, 'Force closed by Admin from Dashboard');
      if (res.success) {
        addToast(`Stream ${roomId} forcefully ended.`, 'success');
        fetchStats();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };



  // If not logged in, show Login page
  if (!user) {
    return (
      <>
        <Login
          onLoginSuccess={handleLoginSuccess}
        />
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className="toast" style={{
              borderColor: t.type === 'error' ? 'rgba(244, 63, 94, 0.4)' : t.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)',
            }}>
              <span>{t.type === 'error' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️'}</span>
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  const tabTitles = {
    dashboard: 'Dashboard',
    streams: 'Live Streams',
    'host-management': 'Hosts',
    'live-rewards': 'Live Rewards',
    levels: 'Levels',
    agencies: 'Agencies',
    resellers: 'Resellers',
    moderators: 'Moderators',
    users: 'Users',
    posts: 'Posts',
    'account-merge': 'Account Merge',
    packages: 'VIP Packages',
    'create-category': 'Categories',
    thumbnails: 'Thumbnails',
    'entry-effects': 'Entry Effects',
    'special-items': 'Special Items',
    banners: 'Banners',
    themes: 'Themes',
    recharge: 'Coin Recharge',
    gifts: 'Gifts',
    'top-contributors': 'Top Contributors',
    withdrawals: 'Withdrawals',
    'app-economy': 'Economy Configuration',
    'call-config': '1-to-1 Calls & Rates',
    'livekit-config': 'LiveKit & WebRTC',
    'screen-guard': 'Screen Guard & Privacy',
    'star-system': 'Star Progression System',
    'wallpaper-pricing': 'Wallpaper Duration Pricing',
    'chat-tester': 'Chat Tester',
    'api-docs': 'API Docs',
    settings: 'Admin Settings',
  };

  return (
    <div className="app-container">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        onLogout={handleLogout}
        activeStreamCount={stats?.streams?.active || 0}
        totalUsersCount={stats?.users?.total || 0}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-layout">
        <Header
          pageTitle={
            activeTab === 'create-category'
              ? 'Create VIP Category'
              : activeTab.startsWith('vip-')
              ? 'VIP Category Packages & Members'
              : tabTitles[activeTab] || 'Console'
          }
          onRefresh={fetchStats}
          isRefreshing={isRefreshing}
          isConnected={isConnected}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="content-area">
          <ErrorBoundary>
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              onNavigate={handleTabChange}
              onTerminateStream={handleTerminateStream}
            />
          )}



          {activeTab === 'streams' && (
            <LiveStreams onToast={addToast} />
          )}

          {activeTab === 'host-management' && (
            <HostManagement onToast={addToast} />
          )}

          {activeTab === 'live-rewards' && (
            <LiveRewards onToast={addToast} />
          )}

          {activeTab === 'levels' && (
            <Levels onToast={addToast} />
          )}

          {activeTab === 'agencies' && (
            <Agencies onToast={addToast} />
          )}

          {activeTab === 'resellers' && (
            <Resellers onToast={addToast} />
          )}

          {activeTab === 'moderators' && (
            <Moderators onToast={addToast} />
          )}

          {activeTab === 'users' && (
            <Users onToast={addToast} />
          )}

          {activeTab === 'reports' && (
            <Reports onToast={addToast} />
          )}

          {activeTab === 'posts' && (
            <Posts onToast={addToast} />
          )}

          {activeTab === 'account-merge' && (
            <AccountMerge onToast={addToast} />
          )}

          {activeTab === 'create-category' && (
            <CreateCategory
              onNavigate={handleTabChange}
              onToast={addToast}
            />
          )}

          {(activeTab === 'packages' || activeTab.startsWith('vip-')) && (
            <PackageManagement
              activeTabKey={activeTab}
              onNavigateTab={handleTabChange}
              onToast={addToast}
            />
          )}

          {(activeTab === 'thumbnails' || activeTab === 'entry-effects' || activeTab === 'special-items') && (
            <SpecialItems
              initialTab={activeTab === 'entry-effects' ? 'entry-effects' : 'thumbnails'}
              onNavigateTab={handleTabChange}
              onToast={addToast}
            />
          )}

          {activeTab === 'banners' && (
            <Banners onToast={addToast} />
          )}

          {activeTab === 'themes' && (
            <AppThemes onToast={addToast} />
          )}

          {activeTab === 'recharge' && (
            <CoinRecharge onToast={addToast} />
          )}

          {activeTab === 'gifts' && (
            <Gifts onToast={addToast} />
          )}

          {activeTab === 'top-contributors' && (
            <TopContributors onToast={addToast} />
          )}

          {activeTab === 'withdrawals' && (
            <Withdrawals onToast={addToast} />
          )}



          {activeTab === 'api-docs' && (
            <ApiDocs onToast={addToast} />
          )}

          {activeTab === 'app-economy' && (
            <Settings onToast={addToast} targetSection="economy" />
          )}

          {activeTab === 'call-config' && (
            <Settings onToast={addToast} targetSection="calls" />
          )}

          {activeTab === 'livekit-config' && (
            <Settings onToast={addToast} targetSection="streaming" />
          )}

          {activeTab === 'screen-guard' && (
            <Settings onToast={addToast} targetSection="screen_guard" />
          )}

          {activeTab === 'star-system' && (
            <Settings onToast={addToast} targetSection="stars" />
          )}

          {activeTab === 'wallpaper-pricing' && (
            <Settings onToast={addToast} targetSection="monetization" />
          )}

          {activeTab === 'settings' && (
            <Settings onToast={addToast} targetSection="admin" />
          )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Dynamic Toast Alerts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast" style={{
            borderColor: t.type === 'error' ? 'rgba(244, 63, 94, 0.4)' : t.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)',
          }}>
            <span>{t.type === 'error' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
