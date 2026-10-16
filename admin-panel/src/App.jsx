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
import RealtimeChatTester from './pages/RealtimeChatTester';
import UserLivePortal from './pages/UserLivePortal';

import { checkHealth, getToken, setToken, getCurrentUser, setCurrentUser } from './api/client';
import dashboardApi from './api/dashboardApi';
import streamApi from './api/streamApi';
import Loader from './components/Loader';

const VALID_TABS = [
  'dashboard',
  'user-portal',
  'streams',
  'host-management',
  'agencies',
  'resellers',
  'moderators',
  'users',
  'posts',
  'account-merge',
  'packages',
  'create-category',
  'thumbnails',
  'entry-effects',
  'special-items',
  'banners',
  'recharge',
  'gifts',
  'top-contributors',
  'withdrawals',
  'chat-tester',
  'api-docs',
  'settings',
];

const isTabValid = (tab) => {
  if (!tab) return false;
  if (['portal', 'live', 'user-portal'].includes(tab)) return true;
  return VALID_TABS.includes(tab) || tab.startsWith('vip-');
};

const normalizeTab = (tab) => {
  if (['portal', 'live'].includes(tab)) return 'user-portal';
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

  const isPortalRoute = activeTab === 'user-portal' ||
    window.location.hash === '#user-portal' ||
    window.location.hash === '#portal' ||
    window.location.hash === '#live' ||
    window.location.pathname.startsWith('/portal') ||
    window.location.pathname.startsWith('/live');

  // If on user-portal route: render standalone User Live Portal
  if (isPortalRoute) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
        <UserLivePortal
          onToast={addToast}
          onSwitchToAdmin={() => handleTabChange('dashboard')}
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
      </div>
    );
  }

  // If not logged in, show Login page
  if (!user) {
    return (
      <>
        <Login
          onLoginSuccess={handleLoginSuccess}
          onOpenUserPortal={() => handleTabChange('user-portal')}
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
    dashboard: 'Dashboard Overview',
    'user-portal': 'Live Stage & User Portal',
    streams: 'Live Video Streams & Rooms',
    'host-management': 'Host Management & Applications',
    agencies: 'Agency & Talent Management',
    resellers: 'Official Resellers & Sales Audit',
    moderators: 'Moderator Team & Permissions',
    users: 'Users',
    posts: 'News Feed & Community Posts',
    'account-merge': 'Account Merge & Email Recovery',
    packages: 'VIP & Privilege Packages Management',
    'create-category': 'Create VIP Category',
    thumbnails: 'Live Room Thumbnails',
    'entry-effects': 'Room Entry Effects',
    'special-items': 'Special Items & Effects',
    banners: 'Promotional & Event Banners',
    recharge: 'Admin Coin Recharge Desk',
    gifts: 'Virtual Gift Economy Store',
    'top-contributors': 'Top Gifting Contributors Leaderboard',
    withdrawals: 'Payout & Cashout Requests',
    'chat-tester': 'Real-Time Socket & Message Tester',
    'api-docs': 'Mobile & REST API Explorer',
    settings: 'Global Platform Settings',
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
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              onNavigate={handleTabChange}
              onTerminateStream={handleTerminateStream}
            />
          )}

          {activeTab === 'user-portal' && (
            <UserLivePortal onToast={addToast} />
          )}

          {activeTab === 'streams' && (
            <LiveStreams onToast={addToast} />
          )}

          {activeTab === 'host-management' && (
            <HostManagement onToast={addToast} />
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

          {activeTab === 'chat-tester' && (
            <RealtimeChatTester onToast={addToast} />
          )}

          {activeTab === 'api-docs' && (
            <ApiDocs onToast={addToast} />
          )}

          {activeTab === 'settings' && (
            <Settings onToast={addToast} />
          )}
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
