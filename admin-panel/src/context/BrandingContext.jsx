import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBase, resolveAssetUrl } from '../api/client';

const BrandingContext = createContext({
  brandName: 'Umi Live',
  brandLogo: '',
  brandTagline: 'Broadcasting & Live Streaming Admin Console',
  resolveBrandLogo: () => '',
  updateBranding: () => {},
  refreshBranding: () => {},
});

export const BrandingProvider = ({ children }) => {
  const [brandName, setBrandName] = useState(() => {
    return localStorage.getItem('admin_brand_name') || 'Umi Live';
  });

  const [brandLogo, setBrandLogo] = useState(() => {
    return localStorage.getItem('admin_brand_logo') || '';
  });

  const [brandTagline, setBrandTagline] = useState(() => {
    return localStorage.getItem('admin_brand_tagline') || 'Broadcasting & Live Streaming Admin Console';
  });

  // Keep Document Title synchronized
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${brandName} - Admin Console`;
      // Update meta description if present
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `${brandName} - Streaming Platform Administration & Real-Time Moderation Console`);
      }
    }
  }, [brandName]);

  const applyBranding = useCallback((name, logo, tagline) => {
    if (name && typeof name === 'string' && name.trim()) {
      const cleanName = name.trim();
      setBrandName(cleanName);
      localStorage.setItem('admin_brand_name', cleanName);
    }
    if (logo !== undefined) {
      const cleanLogo = typeof logo === 'string' ? logo.trim() : '';
      setBrandLogo(cleanLogo);
      if (cleanLogo) {
        localStorage.setItem('admin_brand_logo', cleanLogo);
      } else {
        localStorage.removeItem('admin_brand_logo');
      }
    }
    if (tagline && typeof tagline === 'string' && tagline.trim()) {
      const cleanTagline = tagline.trim();
      setBrandTagline(cleanTagline);
      localStorage.setItem('admin_brand_tagline', cleanTagline);
    }
  }, []);

  const fetchBranding = useCallback(async () => {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/config`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return;
      const data = await res.json();
      const name = data.platform_name || data.app_name;
      const logo = data.platform_logo_url || data.app_logo_url;
      const tagline = data.admin_title;
      applyBranding(name, logo, tagline);
    } catch (e) {
      // Quiet fail to fallback on cached localStorage / default
    }
  }, [applyBranding]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const updateBranding = useCallback(({ name, logo, tagline }) => {
    applyBranding(name, logo, tagline);
  }, [applyBranding]);

  const resolvedLogoUrl = brandLogo ? resolveAssetUrl(brandLogo) : '';

  return (
    <BrandingContext.Provider
      value={{
        brandName,
        brandLogo,
        resolvedLogoUrl,
        brandTagline,
        updateBranding,
        refreshBranding: fetchBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return {
      brandName: 'Umi Live',
      brandLogo: '',
      resolvedLogoUrl: '',
      brandTagline: 'Broadcasting & Live Streaming Admin Console',
      updateBranding: () => {},
      refreshBranding: () => {},
    };
  }
  return ctx;
};
export default BrandingContext;
