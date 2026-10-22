import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Crown,
  ShieldCheck,
  Mic,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Coins,
  Clock,
  User,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Gift,
  X,
  Layers,
  Award,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import packageApi from '../api/packageApi';
import { adminApi } from '../api/adminApi';
import userApi from '../api/userApi';
import { resolveAssetUrl } from '../api/client';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import FileUploadInput from '../components/FileUploadInput';
import BulkActionBar from '../components/BulkActionBar';

const PACKAGE_COLOR_PRESETS = [
  { name: 'Royal Violet', hex: '#8b5cf6' },
  { name: 'Hot Pink', hex: '#ec4899' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Sky Blue', hex: '#3b82f6' },
  { name: 'Crimson', hex: '#ef4444' },
  { name: 'Cyan Neon', hex: '#06b6d4' },
  { name: 'Indigo Glow', hex: '#6366f1' },
  { name: 'Sunset Orange', hex: '#f97316' },
  { name: 'Teal Gem', hex: '#14b8a6' },
  { name: 'Fuchsia', hex: '#d946ef' },
  { name: 'Ruby Dark', hex: '#e11d48' },
];

export default function PackageManagement({ activeTabKey = 'packages', onNavigateTab, onToast }) {
  // Loading states
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Data states
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [subscriberSummary, setSubscriberSummary] = useState(null);

  // Bulk Selection for Packages
  const [selectedPkgIds, setSelectedPkgIds] = useState([]);
  const [bulkDeletingPkgs, setBulkDeletingPkgs] = useState(false);

  // Bulk Selection for Subscribers
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [bulkRevokingSubs, setBulkRevokingSubs] = useState(false);

  const handleToggleSelectAllPkgs = (pkgList) => {
    if (selectedPkgIds.length === pkgList.length) {
      setSelectedPkgIds([]);
    } else {
      setSelectedPkgIds(pkgList.map((p) => p.id));
    }
  };

  const handleToggleSelectPkg = (id) => {
    setSelectedPkgIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeletePkgs = async () => {
    if (selectedPkgIds.length === 0) return;
    try {
      setBulkDeletingPkgs(true);
      const res = await adminApi.bulkDelete('packages', selectedPkgIds);
      if (res.success) {
        onToast(`Successfully deleted ${res.count || selectedPkgIds.length} packages.`, 'success');
        setSelectedPkgIds([]);
        loadPackages();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete packages.', 'error');
    } finally {
      setBulkDeletingPkgs(false);
    }
  };

  const handleToggleSelectAllSubs = () => {
    if (selectedSubIds.length === subscribers.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(subscribers.map((s) => s.id));
    }
  };

  const handleToggleSelectSub = (id) => {
    setSelectedSubIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkRevokeSubs = async () => {
    if (selectedSubIds.length === 0) return;
    try {
      setBulkRevokingSubs(true);
      for (const subId of selectedSubIds) {
        await packageApi.revokeSubscription(subId).catch(() => {});
      }
      onToast(`Revoked ${selectedSubIds.length} package subscriptions.`, 'success');
      setSelectedSubIds([]);
      loadSubscribers();
    } catch (err) {
      onToast(err.message || 'Failed to revoke subscriptions.', 'error');
    } finally {
      setBulkRevokingSubs(false);
    }
  };

  // Internal category selection state allowing instant switching within the page
  const [internalCategoryId, setInternalCategoryId] = useState(null);

  // Sync internalCategoryId when activeTabKey changes
  useEffect(() => {
    if (typeof activeTabKey === 'string' && activeTabKey.startsWith('vip-')) {
      const idStr = activeTabKey.replace('vip-', '');
      const parsed = parseInt(idStr, 10);
      if (parsed) setInternalCategoryId(parsed);
    }
  }, [activeTabKey]);

  // Determine current active category ID from internal state or activeTabKey
  const selectedCategoryId = useMemo(() => {
    if (internalCategoryId) return internalCategoryId;
    if (typeof activeTabKey === 'string' && activeTabKey.startsWith('vip-')) {
      const idStr = activeTabKey.replace('vip-', '');
      return parseInt(idStr, 10) || null;
    }
    return categories.length > 0 ? categories[0].id : null;
  }, [internalCategoryId, activeTabKey, categories]);

  // Current selected category object (defaults to first category if available)
  const currentCategory = useMemo(() => {
    if (selectedCategoryId) {
      return categories.find((c) => c.id === selectedCategoryId) || categories[0] || null;
    }
    return categories[0] || null;
  }, [categories, selectedCategoryId]);

  // Listen for open-create-category-modal event from sidebar
  useEffect(() => {
    const handleOpenModal = () => handleOpenCreateCategory();
    window.addEventListener('open-create-category-modal', handleOpenModal);
    return () => window.removeEventListener('open-create-category-modal', handleOpenModal);
  }, [categories]);

  // Subscribers search & pagination
  const [subSearch, setSubSearch] = useState('');
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(10);
  const [subTotal, setSubTotal] = useState(0);

  // Assign Package Form state
  const [assignUserIdInput, setAssignUserIdInput] = useState('');
  const [assignUser, setAssignUser] = useState(null);
  const [searchingAssignUser, setSearchingAssignUser] = useState(false);
  const [assignPackageId, setAssignPackageId] = useState('');
  const [assignCustomDays, setAssignCustomDays] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Sub-tabs: 'packages' (catalog) | 'assigned' (assigned users & assign form)
  const [currentTab, setCurrentTab] = useState('packages');
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const handleOpenAssignModal = (pkgId = '') => {
    if (pkgId) {
      setAssignPackageId(String(pkgId));
    } else if (currentCategoryPackages.length > 0) {
      setAssignPackageId(String(currentCategoryPackages[0].id));
    }
    setAssignUserIdInput('');
    setAssignUser(null);
    setAssignCustomDays('');
    setAssignModalOpen(true);
  };

  // Create / Edit Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    display_order: 1,
    cant_be_removed: true,
    cant_be_banned: true,
    self_seat_accept: true,
    top_live_list: true,
    anti_mute: false,
    special_entry: true,
    is_active: true,
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // Create / Edit Package Modal
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageForm, setPackageForm] = useState({
    category_id: '',
    name: '',
    image_url: '',
    validity_days: 30,
    price: 10000,
    currency: 'coins',
    description: '',
    color: '#8b5cf6',
    is_active: true,
  });
  const [savingPackage, setSavingPackage] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, id, name }
  const [deleting, setDeleting] = useState(false);

  // View User Profile Modal
  const [detailsUserId, setDetailsUserId] = useState(null);

  // ==========================================
  // Fetch Functions
  // ==========================================
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const res = await packageApi.getCategories();
      if (res.success) {
        setCategories(res.categories || []);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoadingCategories(false);
    }
  }, [onToast]);

  const fetchPackages = useCallback(async () => {
    try {
      setLoadingPackages(true);
      const res = await packageApi.getPackages();
      if (res.success) {
        setPackages(res.packages || []);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoadingPackages(false);
    }
  }, [onToast]);

  const fetchSubscribers = useCallback(async () => {
    try {
      setLoadingSubscribers(true);
      const params = {
        page: subPage,
        limit: subPageSize,
        status: 'all',
      };
      if (selectedCategoryId) {
        params.categoryId = selectedCategoryId;
      }
      if (subSearch.trim()) {
        params.search = subSearch.trim();
      }

      const res = await packageApi.getSubscribers(params);
      if (res.success) {
        setSubscribers(res.subscribers || []);
        setSubTotal(res.pagination?.total || 0);
        if (res.summary) setSubscriberSummary(res.summary);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoadingSubscribers(false);
    }
  }, [subPage, subPageSize, selectedCategoryId, subSearch, onToast]);

  useEffect(() => {
    fetchCategories();
    fetchPackages();
  }, [fetchCategories, fetchPackages]);

  useEffect(() => {
    setSubPage(1);
    fetchSubscribers();
  }, [selectedCategoryId, fetchSubscribers]);

  // Packages of the current selected category
  const currentCategoryPackages = useMemo(() => {
    if (!selectedCategoryId) return packages;
    return packages.filter((p) => p.category_id === selectedCategoryId);
  }, [packages, selectedCategoryId]);

  // Selected package in the assign form
  const selectedAssignPackage = useMemo(() => {
    if (!assignPackageId) return null;
    return packages.find((p) => p.id === parseInt(assignPackageId, 10)) || null;
  }, [assignPackageId, packages]);

  // Packages grouped by Category ID (for the All Categories overview)
  const packagesByCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = [];
    });
    packages.forEach((p) => {
      if (map[p.category_id]) {
        map[p.category_id].push(p);
      } else {
        map[p.category_id] = [p];
      }
    });
    return map;
  }, [categories, packages]);

  // Notify sidebar to refresh categories list
  const notifyCategoriesChanged = () => {
    window.dispatchEvent(new Event('categories-updated'));
  };

  // ==========================================
  // Category Actions
  // ==========================================
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.display_order || 0)) + 1 : 1;
    setCategoryForm({
      name: '',
      badge_icon: '👑',
      color_code: '#7c3aed',
      display_order: nextOrder,
      cant_be_removed: true,
      cant_be_banned: true,
      self_seat_accept: true,
      top_live_list: true,
      anti_mute: false,
      special_entry: true,
      is_active: true,
    });
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      badge_icon: cat.badge_icon || '👑',
      color_code: cat.color_code || '#7c3aed',
      display_order: cat.display_order || 1,
      cant_be_removed: Boolean(cat.cant_be_removed),
      cant_be_banned: Boolean(cat.cant_be_banned),
      self_seat_accept: Boolean(cat.self_seat_accept),
      top_live_list: Boolean(cat.top_live_list),
      anti_mute: Boolean(cat.anti_mute),
      special_entry: Boolean(cat.special_entry),
      is_active: Boolean(cat.is_active),
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      onToast('Category name is required.', 'error');
      return;
    }

    try {
      setSavingCategory(true);
      if (editingCategory) {
        const res = await packageApi.updateCategory(editingCategory.id, categoryForm);
        if (res.success) {
          onToast(res.message, 'success');
          setCategoryModalOpen(false);
          fetchCategories();
          fetchPackages();
          notifyCategoriesChanged();
        }
      } else {
        const res = await packageApi.createCategory(categoryForm);
        if (res.success) {
          onToast(res.message, 'success');
          setCategoryModalOpen(false);
          fetchCategories();
          notifyCategoriesChanged();
        }
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;

    const payload = list.map((c, i) => ({ id: c.id, display_order: i + 1 }));
    setCategories(list);

    try {
      await packageApi.reorderCategories(payload);
      onToast('Live ranking priority order updated!', 'success');
      notifyCategoriesChanged();
    } catch (err) {
      onToast(err.message, 'error');
      fetchCategories();
    }
  };

  // ==========================================
  // Package Actions
  // ==========================================
  const handleOpenCreatePackage = (targetCatId = '') => {
    setEditingPackage(null);
    setPackageForm({
      category_id: targetCatId || selectedCategoryId || (categories[0]?.id || ''),
      name: '',
      image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200',
      validity_days: 30,
      price: 10000,
      currency: 'coins',
      description: '',
      color: '#8b5cf6',
      is_active: true,
    });
    setPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setPackageForm({
      category_id: pkg.category_id,
      name: pkg.name,
      image_url: pkg.image_url || '',
      validity_days: pkg.validity_days,
      price: pkg.price,
      currency: pkg.currency || 'coins',
      description: pkg.description || '',
      color: pkg.color || '#8b5cf6',
      is_active: Boolean(pkg.is_active),
    });
    setPackageModalOpen(true);
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!packageForm.name.trim()) {
      onToast('Package name is required.', 'error');
      return;
    }
    if (!packageForm.category_id) {
      onToast('Please select a Category.', 'error');
      return;
    }

    try {
      setSavingPackage(true);
      if (editingPackage) {
        const res = await packageApi.updatePackage(editingPackage.id, packageForm);
        if (res.success) {
          onToast(res.message, 'success');
          setPackageModalOpen(false);
          fetchPackages();
          notifyCategoriesChanged();
        }
      } else {
        const res = await packageApi.createPackage(packageForm);
        if (res.success) {
          onToast(res.message, 'success');
          setPackageModalOpen(false);
          fetchPackages();
          fetchCategories();
          notifyCategoriesChanged();
        }
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingPackage(false);
    }
  };

  // ==========================================
  // User Lookup & Assign Logic
  // ==========================================
  const handleSearchAssignUser = async () => {
    const clean = assignUserIdInput.trim().replace(/^#/, '');
    if (!clean) {
      onToast('Please enter User ID to verify.', 'error');
      return;
    }

    try {
      setSearchingAssignUser(true);
      setAssignUser(null);
      const res = await userApi.getUsers({ search: clean, limit: 1 });
      if (res.success && res.users && res.users.length > 0) {
        setAssignUser(res.users[0]);
        onToast(`User #${res.users[0].id} found!`, 'success');
      } else {
        onToast(`User #${clean} not found.`, 'error');
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSearchingAssignUser(false);
    }
  };

  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    if (!assignUser) {
      onToast('Please verify the target user first.', 'error');
      return;
    }
    if (!assignPackageId) {
      onToast('Please select a package to assign.', 'error');
      return;
    }

    try {
      setSubmittingAssign(true);
      const parsedDays = parseInt(assignCustomDays, 10);
      const daysToAssign = (!isNaN(parsedDays) && parsedDays > 0)
        ? parsedDays
        : (selectedAssignPackage ? selectedAssignPackage.validity_days : undefined);

      const res = await packageApi.grantPackage({
        userId: assignUser.id,
        packageId: assignPackageId,
        customValidityDays: daysToAssign,
      });

      if (res.success) {
        onToast(res.message, 'success');
        setAssignUserIdInput('');
        setAssignUser(null);
        setAssignPackageId('');
        setAssignCustomDays('');
        setAssignModalOpen(false);
        fetchSubscribers();
        fetchCategories();
        notifyCategoriesChanged();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // ==========================================
  // Delete / Revoke Execution
  // ==========================================
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      if (deleteConfirm.type === 'category') {
        const res = await packageApi.deleteCategory(deleteConfirm.id);
        if (res.success) {
          onToast(res.message, 'success');
          fetchCategories();
          fetchPackages();
          notifyCategoriesChanged();
          if (onNavigateTab) onNavigateTab('packages');
        }
      } else if (deleteConfirm.type === 'package') {
        const res = await packageApi.deletePackage(deleteConfirm.id);
        if (res.success) {
          onToast(res.message, 'success');
          fetchPackages();
          fetchCategories();
          notifyCategoriesChanged();
        }
      } else if (deleteConfirm.type === 'subscription') {
        const res = await packageApi.revokeSubscription(deleteConfirm.id);
        if (res.success) {
          onToast(res.message, 'success');
          fetchSubscribers();
          notifyCategoriesChanged();
        }
      }
      setDeleteConfirm(null);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ========================================================
  // RENDER: SPECIFIC CATEGORY DEDICATED VIEW (e.g. KING)
  // ========================================================
  if (currentCategory) {
    return (
      <div className="page-container" style={{ paddingBottom: '3rem' }}>
        {/* VIP Category Switcher Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '0.85rem',
            marginBottom: '1.25rem',
            scrollbarWidth: 'thin',
          }}
        >
          {categories.map((cat) => {
            const isSelected = currentCategory?.id === cat.id;
            const pkgCount = packages.filter((p) => p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setInternalCategoryId(cat.id);
                  if (onNavigateTab) onNavigateTab(`vip-${cat.id}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #7c3aed' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(124, 58, 237, 0.12)' : 'var(--bg-secondary)',
                  color: isSelected ? '#7c3aed' : 'var(--text-main)',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.15)' : 'none',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{cat.badge_icon || '👑'}</span>
                <span style={{ fontSize: '0.95rem' }}>{cat.name}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: isSelected ? '#7c3aed' : 'var(--bg-card)',
                    color: isSelected ? '#ffffff' : 'var(--text-dim)',
                    fontWeight: 700,
                  }}
                >
                  {pkgCount} {pkgCount === 1 ? 'Package' : 'Packages'}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleOpenCreateCategory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.65rem 1.1rem',
              borderRadius: '12px',
              border: '1px dashed var(--border-color)',
              background: 'transparent',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={15} />
            <span>+ New Category</span>
          </button>
        </div>

        {/* Category Header */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)',
            borderLeft: `5px solid ${currentCategory.color_code || '#7c3aed'}`,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>{currentCategory.badge_icon || '👑'}</span>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {currentCategory.name}
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 9px',
                  borderRadius: '8px',
                  background: 'rgba(124, 58, 237, 0.1)',
                  color: '#7c3aed',
                  fontWeight: 800,
                }}
              >
                Live Priority Rank #{currentCategory.display_order}
              </span>
              <span className={`badge ${currentCategory.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                {currentCategory.is_active ? 'Active Tier' : 'Disabled'}
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              Select packages below to subscribe or configure permissions for {currentCategory.name}.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenEditCategory(currentCategory)}
              style={{ borderRadius: '8px', padding: '0.45rem 0.85rem', gap: '5px' }}
            >
              <Edit2 size={13} />
              <span>Edit Privileges</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenCreatePackage(currentCategory.id)}
              style={{ borderRadius: '8px', padding: '0.45rem 1rem', gap: '5px' }}
            >
              <Plus size={14} />
              <span>+ Add Package</span>
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setDeleteConfirm({ type: 'category', id: currentCategory.id, name: currentCategory.name })}
              style={{ borderRadius: '8px', padding: '0.45rem 0.65rem' }}
              title="Delete Category"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Category Privileges Grid Showcase */}
        <div
          className="panel-card"
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            marginBottom: '1.5rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#7c3aed" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {currentCategory.name} VIP Privileges & Perks
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                (Live room permissions granted to subscribers of {currentCategory.name})
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenEditCategory(currentCategory)}
              style={{ borderRadius: '8px', padding: '0.35rem 0.75rem', fontSize: '0.78rem', gap: '4px' }}
            >
              <Edit2 size={12} />
              <span>Configure Privileges</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {/* 1. Anti-Kick */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: currentCategory.cant_be_removed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${currentCategory.cant_be_removed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ fontSize: '1.4rem' }}>🛡️</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Anti-Kick</strong>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: currentCategory.cant_be_removed ? '#10b981' : 'var(--text-dim)' }}>
                    {currentCategory.cant_be_removed ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
                  Cannot be kicked or removed from live room by room hosts or moderators
                </div>
              </div>
            </div>

            {/* 2. Anti-Ban */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: currentCategory.cant_be_banned ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${currentCategory.cant_be_banned ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ fontSize: '1.4rem' }}>🚫</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Anti-Ban</strong>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: currentCategory.cant_be_banned ? '#10b981' : 'var(--text-dim)' }}>
                    {currentCategory.cant_be_banned ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
                  Immune to room bans, kicks, and blacklist actions
                </div>
              </div>
            </div>

            {/* 3. Auto-Seat */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: currentCategory.self_seat_accept ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${currentCategory.self_seat_accept ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ fontSize: '1.4rem' }}>🎙️</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Auto-Seat Approval</strong>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: currentCategory.self_seat_accept ? '#10b981' : 'var(--text-dim)' }}>
                    {currentCategory.self_seat_accept ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
                  User automatically occupies microphone seats without host approval
                </div>
              </div>
            </div>

            {/* 4. Top Live Ranking */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: currentCategory.top_live_list ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${currentCategory.top_live_list ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-color)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ fontSize: '1.4rem' }}>🚀</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Top Live Ranking</strong>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: currentCategory.top_live_list ? '#06b6d4' : 'var(--text-dim)' }}>
                    {currentCategory.top_live_list ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
                  Pinned at top of audience list & priority in live explore feed
                </div>
              </div>
            </div>

            {/* 5. Anti-Mute */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: currentCategory.anti_mute ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${currentCategory.anti_mute ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ fontSize: '1.4rem' }}>🔇</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Anti-Mute</strong>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: currentCategory.anti_mute ? '#10b981' : 'var(--text-dim)' }}>
                    {currentCategory.anti_mute ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
                  Immune to microphone muting by room hosts and moderators
                </div>
              </div>
            </div>


            {/* Custom / Additional Privileges for Current Category */}
            {(() => {
              let customList = [];
              if (Array.isArray(currentCategory.privilege_list)) {
                customList = currentCategory.privilege_list.filter((p) => p.is_custom);
              } else if (Array.isArray(currentCategory.custom_privileges)) {
                customList = currentCategory.custom_privileges.map((cp) =>
                  typeof cp === 'string' ? { name: cp, icon: '⭐', description: cp } : cp
                );
              } else if (typeof currentCategory.custom_privileges === 'string') {
                try {
                  const parsed = JSON.parse(currentCategory.custom_privileges);
                  if (Array.isArray(parsed)) {
                    customList = parsed.map((cp) =>
                      typeof cp === 'string' ? { name: cp, icon: '⭐', description: cp } : cp
                    );
                  }
                } catch (e) {}
              }

              if (!customList || customList.length === 0) return null;

              return (
                <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.85rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⭐</span> Additional Tier Perks & Custom Privileges ({customList.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                    {customList.map((cp, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(124, 58, 237, 0.06)',
                          border: '1px solid rgba(124, 58, 237, 0.2)',
                          fontSize: '0.82rem',
                          color: 'var(--text-main)',
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>{cp.icon || '⭐'}</span>
                        <span>{cp.name || cp.description || String(cp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* SUB-TABS: PACKAGES CATALOG vs ASSIGNED USERS */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={() => setCurrentTab('packages')}
            style={{
              padding: '0.55rem 1.35rem',
              borderRadius: '10px',
              border: 'none',
              background: currentTab === 'packages' ? 'rgba(124, 58, 237, 0.16)' : 'var(--bg-secondary)',
              color: currentTab === 'packages' ? '#7c3aed' : 'var(--text-dim)',
              fontWeight: currentTab === 'packages' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.92rem',
              transition: 'all 0.15s ease',
              outline: currentTab === 'packages' ? '1px solid rgba(124, 58, 237, 0.4)' : '1px solid var(--border-color)',
            }}
          >
            <Layers size={17} />
            <span>Packages Catalog ({currentCategoryPackages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('assigned')}
            style={{
              padding: '0.55rem 1.35rem',
              borderRadius: '10px',
              border: 'none',
              background: currentTab === 'assigned' ? 'rgba(124, 58, 237, 0.16)' : 'var(--bg-secondary)',
              color: currentTab === 'assigned' ? '#7c3aed' : 'var(--text-dim)',
              fontWeight: currentTab === 'assigned' ? 800 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.92rem',
              transition: 'all 0.15s ease',
              outline: currentTab === 'assigned' ? '1px solid rgba(124, 58, 237, 0.4)' : '1px solid var(--border-color)',
            }}
          >
            <Gift size={17} />
            <span>Assigned Users ({subTotal})</span>
          </button>
        </div>

        {/* TAB 1: PACKAGES CATALOG OF THIS CATEGORY */}
        {currentTab === 'packages' && (
          <div className="panel-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Packages of {currentCategory.name} ({currentCategoryPackages.length})
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Packages with validity durations and coin prices available for {currentCategory.name}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentCategoryPackages.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)', margin: '0 8px 0 0' }}>
                    <input
                      type="checkbox"
                      checked={selectedPkgIds.length === currentCategoryPackages.length && currentCategoryPackages.length > 0}
                      onChange={() => handleToggleSelectAllPkgs(currentCategoryPackages)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                    />
                    <span style={{ fontWeight: 600 }}>Select All</span>
                  </label>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenAssignModal()}
                  style={{ borderRadius: '8px', padding: '0.45rem 0.95rem', gap: '6px', fontWeight: 700 }}
                >
                  <Gift size={14} color="#7c3aed" />
                  <span>Assign to User</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenCreatePackage(currentCategory.id)}
                  style={{ borderRadius: '8px', padding: '0.45rem 1rem', gap: '5px' }}
                >
                  <Plus size={14} />
                  <span>+ Add Package</span>
                </button>
              </div>
            </div>

          {/* Bulk Action Bar for Packages */}
          <BulkActionBar
            selectedCount={selectedPkgIds.length}
            totalCount={currentCategoryPackages.length}
            onSelectAll={() => handleToggleSelectAllPkgs(currentCategoryPackages)}
            onClearSelection={() => setSelectedPkgIds([])}
            onDelete={handleBulkDeletePkgs}
            entityName="packages"
            deleting={bulkDeletingPkgs}
          />

          {loadingPackages ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <Loader inline />
            </div>
          ) : currentCategoryPackages.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '12px' }}>
              <Layers size={36} style={{ opacity: 0.35, margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                No packages created for {currentCategory.name} yet
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 1rem' }}>
                Add validity periods (e.g. 7 Days, 30 Days) and coin prices for users to purchase.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenCreatePackage(currentCategory.id)}
              >
                + Add First Package
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {currentCategoryPackages.map((pkg) => {
                const isSelected = selectedPkgIds.includes(pkg.id);
                const pkgThemeColor = pkg.color || '#8b5cf6';
                return (
                <div
                  key={pkg.id}
                  style={{
                    background: 'var(--bg-primary)',
                    border: isSelected ? '2px solid #ef4444' : '1px solid var(--border-color)',
                    borderLeft: `4px solid ${pkgThemeColor}`,
                    boxShadow: isSelected ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                    position: 'relative',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Selection Checkbox */}
                    <div style={{ alignSelf: 'flex-start' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectPkg(pkg.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                        title={`Select package #${pkg.id}`}
                      />
                    </div>
                    {pkg.image_url ? (
                      <img
                        src={resolveAssetUrl(pkg.image_url)}
                        alt=""
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: `2px solid ${pkgThemeColor}50`,
                          boxShadow: `0 2px 8px ${pkgThemeColor}30`,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          background: 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.4rem',
                          border: `2px solid ${pkgThemeColor}50`,
                        }}
                      >
                        📦
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pkg.name}
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.76rem', color: '#7c3aed', fontWeight: 700 }}>
                          ⏳ {pkg.validity_days} Days
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#d97706', fontWeight: 700 }}>
                          🪙 {pkg.price?.toLocaleString()} Coins
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${pkg.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem' }}>
                        {pkg.is_active ? 'Active' : 'Disabled'}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: `${pkgThemeColor}18`,
                          color: pkgThemeColor,
                          border: `1px solid ${pkgThemeColor}40`,
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                        title="Package Theme Color"
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: pkgThemeColor,
                            boxShadow: `0 0 5px ${pkgThemeColor}`,
                          }}
                        />
                        {pkgThemeColor}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenAssignModal(pkg.id)}
                        style={{ padding: '3px 8px', fontSize: '0.74rem', gap: '4px' }}
                        title="Assign to User"
                      >
                        <Gift size={12} color="#7c3aed" />
                        <span>Assign</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEditPackage(pkg)}
                        style={{ padding: '3px 7px' }}
                        title="Edit Package"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteConfirm({ type: 'package', id: pkg.id, name: pkg.name });
                        }}
                        style={{ padding: '4px 8px', borderRadius: '6px' }}
                        title="Delete Package"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
        )}

        {/* TAB 2: ASSIGNED USERS (With Assign Form + Subscribed Users List) */}
        {currentTab === 'assigned' && (
          <>
            {/* ASSIGN PACKAGE TO USER FORM */}
            <div className="panel-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Gift size={20} color="#7c3aed" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Assign {currentCategory.name} Package to User
                </h2>
              </div>

          <form onSubmit={handleSubmitAssign} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            {/* Step 1: User ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                User ID: *
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter numeric User ID (e.g. 5)"
                  value={assignUserIdInput}
                  onChange={(e) => setAssignUserIdInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSearchAssignUser}
                  disabled={searchingAssignUser}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {searchingAssignUser ? 'Checking...' : 'Check'}
                </button>
              </div>
            </div>

            {/* Step 2: Choose Package */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Select Package: *
              </label>
              <select
                className="input-field"
                value={assignPackageId}
                onChange={(e) => setAssignPackageId(e.target.value)}
                required
              >
                <option value="">-- Choose {currentCategory.name} Package --</option>
                {currentCategoryPackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.validity_days} Days) - {pkg.price?.toLocaleString()} Coins
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Custom Days */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Duration (Days - Optional):
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                placeholder={selectedAssignPackage ? `Default: ${selectedAssignPackage.validity_days} Days` : 'Package default days'}
                value={assignCustomDays}
                onChange={(e) => setAssignCustomDays(e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                {selectedAssignPackage
                  ? `Leave empty to assign package duration (${selectedAssignPackage.validity_days} days)`
                  : 'If empty, package duration will be assigned'}
              </span>
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingAssign || !assignUser || !assignPackageId}
                style={{ width: '100%', padding: '0.55rem', fontWeight: 700 }}
              >
                {submittingAssign ? 'Assigning...' : `Assign ${currentCategory.name}`}
              </button>
            </div>
          </form>

          {/* Verified user card preview */}
          {assignUser && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <img
                src={assignUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${assignUser.id}`}
                alt=""
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{assignUser.full_name || 'User'}</strong>
                  <span className="user-id-badge" style={{ fontSize: '0.72rem' }}>#{assignUser.id}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {assignUser.email} • 🪙 {assignUser.coins_balance?.toLocaleString() || 0} Coins
                </div>
              </div>
              <CheckCircle size={20} color="#10b981" />
            </div>
          )}
        </div>

        {/* SUBSCRIBED USERS TABLE */}
        <div className="panel-card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Users Subscribed to {currentCategory.name} ({subTotal})
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Active and past subscribers holding {currentCategory.name} privileges
              </p>
            </div>

            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search user ID (#5), name..."
                value={subSearch}
                onChange={(e) => {
                  setSubSearch(e.target.value);
                  setSubPage(1);
                }}
                style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.84rem' }}
              />
            </div>
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table className="data-table" style={{ margin: 0, minWidth: '850px', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={subscribers.length > 0 && selectedSubIds.length === subscribers.length}
                      onChange={handleToggleSelectAllSubs}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                    />
                  </th>
                  <th>User ID</th>
                  <th>User Profile</th>
                  <th>Package Name</th>
                  <th>Started Date</th>
                  <th>Expiration Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingSubscribers ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem' }}>
                      <Loader inline />
                      <div style={{ marginTop: '0.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                        Loading subscribers...
                      </div>
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                      <Award size={36} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>No Subscribers Found</div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        {subSearch ? `No user found matching "${subSearch}".` : `No users currently hold ${currentCategory.name} package.`}
                      </p>
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => {
                    const isActive = Boolean(sub.is_currently_active);
                    const sId = sub.subscription_id || sub.id;

                    return (
                      <tr key={sId}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedSubIds.includes(sId)}
                            onChange={() => handleToggleSelectSub(sId)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                          />
                        </td>
                        <td>
                          <span className="user-id-badge">#{sub.user_id}</span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={sub.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${sub.user_id}`}
                              alt=""
                              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                                {sub.user_name || `User #${sub.user_id}`}
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{sub.user_email}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            {sub.package_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {sub.validity_days} days package
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                            {new Date(sub.start_date).toLocaleDateString()}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isActive ? 'var(--text-main)' : 'var(--text-dim)' }}>
                            {new Date(sub.expires_at).toLocaleDateString()}
                          </span>
                          {isActive && sub.days_remaining !== undefined && (
                            <div style={{ fontSize: '0.72rem', color: sub.days_remaining <= 3 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                              {sub.days_remaining === 0 ? 'Today' : `${sub.days_remaining} days left`}
                            </div>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                            {isActive ? 'Active' : 'Expired'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setDetailsUserId(sub.user_id)}
                              style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                            >
                              View
                            </button>

                            {isActive && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'subscription',
                                    id: sub.subscription_id,
                                    name: `${sub.user_name || `User #${sub.user_id}`}'s ${sub.package_name}`,
                                  })
                                }
                                style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border-color)' }}>
            <Pagination
              currentPage={subPage}
              totalPages={Math.ceil(subTotal / subPageSize) || 1}
              totalItems={subTotal}
              pageSize={subPageSize}
              onPageChange={(p) => setSubPage(p)}
              onPageSizeChange={(s) => {
                setSubPageSize(s);
                setSubPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        </div>

        <BulkActionBar
          selectedCount={selectedSubIds.length}
          totalCount={subscribers.length}
          onSelectAll={handleToggleSelectAllSubs}
          onDeselectAll={() => setSelectedSubIds([])}
          onBulkDelete={handleBulkRevokeSubs}
          isDeleting={bulkRevokingSubs}
          entityName="Subscribers"
          actionLabel="Revoke Selected"
        />
        </>
        )}

        {/* Modals reuse */}
        {renderModals()}
      </div>
    );
  }

  // Fallback empty state if no categories exist at all
  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      <div className="panel-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
        <Crown size={44} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>No Categories Created Yet</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '4px 0 1rem' }}>
          Click below to create your first VIP Category.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (onNavigateTab ? onNavigateTab('create-category') : handleOpenCreateCategory())}
        >
          + Create First Category
        </button>
      </div>

      {renderModals()}
    </div>
  );

  // Helper function to render common modals
  function renderModals() {
    return (
      <>
        {/* MODAL 1: CREATE / EDIT CATEGORY */}
        {categoryModalOpen && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCategoryModalOpen(false);
            }}
          >
            <div
              className="modal-box"
              style={{
                maxWidth: '600px',
                width: '100%',
                maxHeight: 'min(90vh, 800px)',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              {/* Fixed Header */}
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(124, 58, 237, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Crown size={20} color="#7c3aed" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                      {editingCategory ? 'Edit Category & Privileges' : 'Create Package Category'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Configure VIP tier privileges, permissions, badge and ranking
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCategoryModalOpen(false)}
                  style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form wrapping scrollable content and fixed footer */}
              <form
                onSubmit={handleSaveCategory}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Scrollable Body */}
                <div
                  style={{
                    padding: '1.25rem 1.5rem',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.1rem',
                  }}
                >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Category Name: *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. King, Duke, Knight, VIP 1"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Priority Rank (#):
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      value={categoryForm.display_order}
                      onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value, 10) || 1 })}
                      title="1 is highest live room display rank"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Badge Icon:
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['👑', '💎', '⚔️', '🛡️', '🌟', '🎖️', '⚡', '🔥'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, badge_icon: emoji })}
                          style={{
                            fontSize: '1.2rem',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            border: categoryForm.badge_icon === emoji ? '2px solid #7c3aed' : '1px solid var(--border-color)',
                            background: categoryForm.badge_icon === emoji ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Color Accent:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                      {['#7c3aed', '#f59e0b', '#06b6d4', '#10b981', '#ec4899', '#ef4444'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, color_code: c })}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: c,
                            border: categoryForm.color_code === c ? '3px solid #ffffff' : 'none',
                            outline: categoryForm.color_code === c ? `2px solid ${c}` : 'none',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Privileges Configuration */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7c3aed', marginBottom: '4px' }}>
                    Category Privileges & Permissions:
                  </div>

                  {/* 1. Anti-Kick */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.84rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>Cannot be removed from room (Anti-Kick)</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Host or moderators cannot kick user out of live room</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={categoryForm.cant_be_removed}
                      onChange={(e) => setCategoryForm({ ...categoryForm, cant_be_removed: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>

                  {/* 2. Anti-Ban */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.84rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>Cannot be banned from room (Anti-Ban)</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>User is immune from room blacklist and ban actions</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={categoryForm.cant_be_banned}
                      onChange={(e) => setCategoryForm({ ...categoryForm, cant_be_banned: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>

                  {/* 3. Self-Seat Accept */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.84rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>Can self-accept own seat request (Auto-Seat Approval)</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>User automatically jumps onto mic seats without host approval</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={categoryForm.self_seat_accept}
                      onChange={(e) => setCategoryForm({ ...categoryForm, self_seat_accept: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>

                  {/* 4. Top Live List Boost */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.84rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>Show rooms at top of live explore list</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Host streams appear first sorted by Priority Rank #{categoryForm.display_order}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={categoryForm.top_live_list}
                      onChange={(e) => setCategoryForm({ ...categoryForm, top_live_list: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>

                  {/* 5. Anti-Mute */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.84rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>Immune to mic mute (Anti-Mute)</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Host or moderators cannot mute user microphone</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={categoryForm.anti_mute}
                      onChange={(e) => setCategoryForm({ ...categoryForm, anti_mute: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>


                  {/* 7. Active Status */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.84rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>Active Tier Status</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Enabled for user subscription in the mobile app</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={categoryForm.is_active}
                      onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>
                </div>
              </div>

                {/* Fixed Footer */}
                <div
                  style={{
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    flexShrink: 0,
                  }}
                >
                  <button type="button" className="btn btn-secondary" onClick={() => setCategoryModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingCategory} style={{ minWidth: '130px', fontWeight: 700 }}>
                    {savingCategory ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CREATE / EDIT PACKAGE */}
        {packageModalOpen && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPackageModalOpen(false);
            }}
          >
            <div
              className="modal-box"
              style={{
                maxWidth: '560px',
                width: '100%',
                maxHeight: 'min(90vh, 760px)',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              {/* Fixed Modal Header */}
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(124, 58, 237, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Layers size={20} color="#7c3aed" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                      {editingPackage ? 'Edit Package' : 'Create Package'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Configure package details, duration, price & custom accent color
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPackageModalOpen(false)}
                  style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form wrapping scrollable content and fixed footer */}
              <form
                onSubmit={handleSavePackage}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Scrollable Form Body */}
                <div
                  style={{
                    padding: '1.25rem 1.5rem',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.1rem',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Category: *
                    </label>
                    <select
                      className="input-field"
                      value={packageForm.category_id}
                      onChange={(e) => setPackageForm({ ...packageForm, category_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Rank #{c.display_order})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Package Name: *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. King Monthly Pass, Duke 7-Day"
                      value={packageForm.name}
                      onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <FileUploadInput
                    label="Package Badge / Image:"
                    value={packageForm.image_url}
                    onChange={(url) => setPackageForm({ ...packageForm, image_url: url })}
                    category="packages"
                    accept="image/*,.svg,.png,.jpg,.webp"
                    type="image"
                    placeholder="https://example.com/badge.png or Upload from PC"
                    helperText="Package badge icon shown in user profiles, streams, and VIP list. Upload from PC or paste URL."
                    onToast={onToast}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        Validity Time (Days): *
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="input-field"
                        placeholder="e.g. 30"
                        value={packageForm.validity_days}
                        onChange={(e) => setPackageForm({ ...packageForm, validity_days: parseInt(e.target.value, 10) || 1 })}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        Price (in Coins): *
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="input-field"
                        placeholder="e.g. 10000"
                        value={packageForm.price}
                        onChange={(e) => setPackageForm({ ...packageForm, price: parseInt(e.target.value, 10) || 0 })}
                        required
                      />
                    </div>
                  </div>

                  {/* Package Specific Color Selector */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🎨 Package Color / Accent Theme: *
                      </span>
                      <span style={{ fontSize: '0.74rem', color: packageForm.color || '#8b5cf6', fontWeight: 800, fontFamily: 'monospace' }}>
                        {packageForm.color || '#8b5cf6'}
                      </span>
                    </label>

                    {/* Swatches */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '0.65rem' }}>
                      {PACKAGE_COLOR_PRESETS.map((p) => {
                        const isSelected = (packageForm.color || '').toLowerCase() === p.hex.toLowerCase();
                        return (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => setPackageForm({ ...packageForm, color: p.hex })}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '7px',
                              background: p.hex,
                              border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                              boxShadow: isSelected ? `0 0 0 2px ${p.hex}, 0 2px 6px ${p.hex}80` : 'none',
                              cursor: 'pointer',
                              transition: 'transform 0.15s, box-shadow 0.15s',
                              transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                              padding: 0,
                            }}
                            title={`${p.name} (${p.hex})`}
                          />
                        );
                      })}
                    </div>

                    {/* Color Wheel + Hex input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          position: 'relative',
                          width: '38px',
                          height: '36px',
                          borderRadius: '8px',
                          background: packageForm.color || '#8b5cf6',
                          border: '1px solid var(--border-color)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: `0 0 10px ${(packageForm.color || '#8b5cf6')}50`,
                          flexShrink: 0,
                        }}
                      >
                        <input
                          type="color"
                          value={packageForm.color?.startsWith('#') && packageForm.color.length === 7 ? packageForm.color : '#8b5cf6'}
                          onChange={(e) => setPackageForm({ ...packageForm, color: e.target.value })}
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            left: '-10px',
                            width: '60px',
                            height: '60px',
                            cursor: 'pointer',
                            opacity: 0,
                          }}
                        />
                      </div>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="#8b5cf6"
                        value={packageForm.color}
                        onChange={(e) => setPackageForm({ ...packageForm, color: e.target.value })}
                        style={{ flex: 1, fontFamily: 'monospace', fontWeight: 600, padding: '0.4rem 0.65rem', fontSize: '0.85rem' }}
                        required
                      />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginTop: '5px' }}>
                      Visual accent color for this specific package item (not the whole category).
                    </span>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Description (Optional):
                    </label>
                    <textarea
                      className="input-field"
                      rows="2"
                      placeholder="e.g. 30 days of VIP privileges with exclusive colored badge"
                      value={packageForm.description}
                      onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                    />
                  </div>

                  {/* Active Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="pkg_is_active"
                      checked={packageForm.is_active}
                      onChange={(e) => setPackageForm({ ...packageForm, is_active: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#7c3aed', cursor: 'pointer' }}
                    />
                    <label htmlFor="pkg_is_active" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                      Active & Available for Users in Mobile App
                    </label>
                  </div>
                </div>

                {/* Fixed Modal Footer */}
                <div
                  style={{
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    flexShrink: 0,
                  }}
                >
                  <button type="button" className="btn btn-secondary" onClick={() => setPackageModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingPackage} style={{ minWidth: '130px', fontWeight: 700 }}>
                    {savingPackage ? 'Saving...' : editingPackage ? 'Save Changes' : 'Create Package'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: DELETE CONFIRMATION */}
        {deleteConfirm && (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
            <div className="modal-box" style={{ maxWidth: '420px', textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: '#ef4444',
                }}
              >
                <AlertTriangle size={24} />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
                Confirm {deleteConfirm.type === 'subscription' ? 'Revoke' : 'Delete'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: '0 0 1rem' }}>
                Are you sure you want to {deleteConfirm.type === 'subscription' ? 'revoke' : 'delete'}{' '}
                <strong style={{ color: 'var(--text-main)' }}>"{deleteConfirm.name}"</strong>?
              </p>
              {deleteConfirm.type === 'category' && (
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '1.25rem', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, display: 'block' }}>
                    ⚠️ All packages under this category and all user subscriptions assigned to this category will also be permanently deleted!
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleExecuteDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Processing...' : 'Yes, Proceed'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {detailsUserId && (
          <UserDetailsModal
            userId={detailsUserId}
            isOpen={Boolean(detailsUserId)}
            onClose={() => setDetailsUserId(null)}
            onToast={onToast}
          />
        )}

        {/* QUICK ASSIGN PACKAGE MODAL */}
        {assignModalOpen && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAssignModalOpen(false);
            }}
          >
            <div className="modal-box" style={{ maxWidth: '520px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={20} color="#7c3aed" />
                  <span>Assign {currentCategory?.name || 'VIP'} Package</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAssignModalOpen(false)}
                  style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    User ID: *
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Enter numeric User ID (e.g. 5)"
                      value={assignUserIdInput}
                      onChange={(e) => setAssignUserIdInput(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleSearchAssignUser}
                      disabled={searchingAssignUser}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {searchingAssignUser ? 'Checking...' : 'Check'}
                    </button>
                  </div>
                </div>

                {assignUser && (
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <img
                      src={assignUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${assignUser.id}`}
                      alt=""
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>{assignUser.full_name}</strong>
                        <span className="user-id-badge">#{assignUser.id}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{assignUser.email}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Select Package: *
                  </label>
                  <select
                    className="input-field"
                    value={assignPackageId}
                    onChange={(e) => setAssignPackageId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Package --</option>
                    {currentCategoryPackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.validity_days} Days) - {pkg.price?.toLocaleString()} Coins
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Duration (Days - Optional):
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder={selectedAssignPackage ? `Default: ${selectedAssignPackage.validity_days} Days` : 'Package default days'}
                    value={assignCustomDays}
                    onChange={(e) => setAssignCustomDays(e.target.value)}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                    {selectedAssignPackage
                      ? `Leave empty to assign package duration (${selectedAssignPackage.validity_days} days)`
                      : 'If empty, package duration will be assigned'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setAssignModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingAssign || !assignUser || !assignPackageId}
                  >
                    {submittingAssign ? 'Assigning...' : 'Assign Package'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }
}
