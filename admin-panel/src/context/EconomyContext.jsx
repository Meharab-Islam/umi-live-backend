import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsApi } from '../api/settingsApi';

const EconomyContext = createContext({
  isDiamondMode: false,
  setIsDiamondMode: () => { },
  refreshEconomy: () => { },
});

export const EconomyProvider = ({ children }) => {
  const [isDiamondMode, setIsDiamondMode] = useState(false);

  const fetchEconomy = async () => {
    try {
      const res = await settingsApi.getSettings();
      if (res && res.success && Array.isArray(res.settings)) {
        const modeSetting = res.settings.find((s) => s.key_name === 'is_convert_to_diamond');
        setIsDiamondMode(
          modeSetting
            ? modeSetting.key_value === 'true' || modeSetting.key_value === '1'
            : false
        );
      }
    } catch (err) {
      console.warn('EconomyContext fetch failed:', err.message);
    }
  };

  useEffect(() => {
    fetchEconomy();
  }, []);

  return (
    <EconomyContext.Provider value={{ isDiamondMode, setIsDiamondMode, refreshEconomy: fetchEconomy }}>
      {children}
    </EconomyContext.Provider>
  );
};

export const useEconomy = () => useContext(EconomyContext);
export default EconomyContext;
