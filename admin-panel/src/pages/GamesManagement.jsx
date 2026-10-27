import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Play,
  Sliders,
  ExternalLink,
  Power,
  Coins,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Settings,
  AlertTriangle,
  Layers,
  Activity,
  Flame,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import gameApi from '../api/gameApi';
import Loader from '../components/Loader';
import { copyToClipboard } from '../utils/clipboard';

export default function GamesManagement() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const res = await gameApi.getGames();
      if (res.success && res.games) {
        setGames(res.games);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch games', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggle = async (game) => {
    try {
      setTogglingId(game.id || game.slug);
      const res = await gameApi.toggleGame(game.id || game.slug);
      if (res.success) {
        setGames((prev) =>
          prev.map((g) =>
            g.id === game.id || g.slug === game.slug
              ? { ...g, is_active: res.isActive }
              : g
          )
        );
        showToast(res.message || `${game.name} status updated!`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to toggle game status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCopyUrl = (url, slug) => {
    copyToClipboard(url);
    setCopiedSlug(slug);
    showToast(`Copied Mobile Integration URL for ${slug}!`);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const activeCount = games.filter((g) => g.is_active).length;
  const disabledCount = games.length - activeCount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md border transition-all transform animate-slideDown ${
            toastMessage.type === 'error'
              ? 'bg-red-500/90 text-white border-red-400'
              : 'bg-emerald-600/95 text-white border-emerald-400'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-indigo-900/40 border border-purple-500/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Integrated Real-Time Mini-Games
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Gamepad2 className="w-8 h-8 text-purple-400" />
              Mini-Games Management & Control Center
            </h1>
            <p className="text-sm sm:text-base text-gray-300 max-w-2xl">
              Enable or disable games, access individual game admin controllers, inspect live ports, and obtain mobile WebView integration URLs with instant Redis Pub/Sub balance sync.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchGames}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-semibold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Games</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{games.length}</span>
            <span className="text-xs text-purple-400 font-medium">Integrated</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Games</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{activeCount}</span>
            <span className="text-xs text-emerald-400/80 font-medium">Live & Playable</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Under Maintenance</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">{disabledCount}</span>
            <span className="text-xs text-amber-400/80 font-medium">Disabled</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sync Architecture</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-base font-bold text-cyan-300">Redis Pub/Sub</span>
            <span className="text-xs text-cyan-400/80 font-medium">Zero-Crash Bridge</span>
          </div>
        </div>
      </div>

      {/* Pub/Sub Architecture Info Banner */}
      <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-cyan-400 flex-shrink-0" />
        <p className="text-xs sm:text-sm text-cyan-200">
          <strong className="text-white font-semibold">Zero-Crash Isolated Sockets:</strong> Game realtime channels run on dedicated ports and communicate with the main backend via high-speed Redis Pub/Sub. User coins and bets are committed directly to the central MySQL database and live stream rooms remain 100% crash-free.
        </p>
      </div>

      {/* Games List Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {games.map((game) => {
            const isToggling = togglingId === (game.id || game.slug);
            const isCopied = copiedSlug === game.slug;

            return (
              <div
                key={game.slug || game.id}
                className={`relative rounded-3xl border transition-all duration-300 overflow-hidden backdrop-blur-xl ${
                  game.is_active
                    ? 'bg-slate-900/70 border-purple-500/20 hover:border-purple-500/40 shadow-lg hover:shadow-purple-500/10'
                    : 'bg-slate-900/40 border-slate-800 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Top Bar with Status Badge & Toggle */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/30 p-2 flex items-center justify-center flex-shrink-0 shadow-inner">
                        {game.icon_url ? (
                          <img
                            src={game.icon_url}
                            alt={game.name}
                            className="w-full h-full object-contain rounded-xl"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Gamepad2 className="w-8 h-8 text-purple-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white tracking-wide">{game.name}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-purple-300 border border-purple-500/20 capitalize">
                            {game.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{game.description}</p>
                      </div>
                    </div>

                    {/* Enable / Disable Toggle Switch */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(game)}
                        disabled={isToggling}
                        className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          game.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                        } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                        title={game.is_active ? 'Click to Disable Game' : 'Click to Enable Game'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            game.is_active ? 'translate-x-7' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          game.is_active ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {game.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                  </div>

                  {/* Chips & Betting Specs */}
                  <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/50">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block">Min / Max Bet</span>
                      <span className="font-semibold text-white mt-0.5 block">
                        🪙 {game.min_bet?.toLocaleString()} - {game.max_bet?.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/50">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block">Dedicated Socket</span>
                      <span className="font-semibold text-cyan-300 mt-0.5 block truncate">
                        Port {game.dedicated_url ? game.dedicated_url.split(':').pop() : '5060'}
                      </span>
                    </div>

                    <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/50 col-span-2 sm:col-span-1">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block">Supported Chips</span>
                      <span className="font-semibold text-amber-300 mt-0.5 block truncate">
                        {Array.isArray(game.chips) ? game.chips.join(', ') : '100, 500, 1000'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 pt-2">
                    {/* Open Game Admin Controller Button */}
                    <a
                      href={game.admin_url || game.web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-semibold text-xs transition-all hover:scale-105 active:scale-95 shadow-sm"
                    >
                      <Sliders className="w-3.5 h-3.5 text-purple-300" />
                      Open Game Admin Panel
                      <ExternalLink className="w-3 h-3 text-purple-400" />
                    </a>

                    {/* Test Play Game Button */}
                    <a
                      href={game.web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-200 font-semibold text-xs transition-all hover:scale-105 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      Play / Preview Game
                    </a>

                    {/* Copy Mobile Integration URL Button */}
                    <button
                      onClick={() => handleCopyUrl(game.web_url, game.slug)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-gray-200 font-medium text-xs transition-all hover:scale-105 active:scale-95 ml-auto"
                      title="Copy Mobile In-App WebView URL"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied URL!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                          <span>Copy Mobile URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom URL Preview Bar */}
                <div className="px-6 py-2.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="truncate max-w-[85%] font-mono text-gray-400">
                    <span className="text-purple-400 font-semibold">WebView Route:</span> {game.web_url}
                  </span>
                  <span className="text-slate-500 font-mono">slug: {game.slug}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
