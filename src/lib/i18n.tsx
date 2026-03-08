import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Lang = 'en' | 'sw';

const translations: Record<string, Record<Lang, string>> = {
  // Nav
  'nav.dashboard': { en: 'Dashboard', sw: 'Dashibodi' },
  'nav.expenses': { en: 'Expenses', sw: 'Matumizi' },
  'nav.budget': { en: 'Budget', sw: 'Bajeti' },
  'nav.savings': { en: 'Savings', sw: 'Akiba' },
  'nav.advisor': { en: 'AI Advisor', sw: 'Mshauri AI' },
  'nav.debts': { en: 'Debts', sw: 'Madeni' },
  'nav.tax': { en: 'Tax', sw: 'Kodi' },
  'nav.investments': { en: 'Investments', sw: 'Uwekezaji' },
  'nav.bills': { en: 'Bills', sw: 'Bili' },
  'nav.settings': { en: 'Settings', sw: 'Mipangilio' },
  // Dashboard
  'dash.greeting': { en: 'Hello', sw: 'Habari' },
  'dash.balance': { en: 'Total Balance', sw: 'Salio Jumla' },
  'dash.income': { en: 'Income', sw: 'Mapato' },
  'dash.expenses': { en: 'Expenses', sw: 'Matumizi' },
  'dash.savings': { en: 'Savings', sw: 'Akiba' },
  'dash.health': { en: 'Financial Health', sw: 'Hali ya Fedha' },
  'dash.insights': { en: 'AI Insights', sw: 'Maarifa ya AI' },
  'dash.recent': { en: 'Recent Transactions', sw: 'Miamala ya Hivi Karibuni' },
  // Expenses
  'exp.add': { en: 'Add Expense', sw: 'Ongeza Matumizi' },
  'exp.amount': { en: 'Amount', sw: 'Kiasi' },
  'exp.category': { en: 'Category', sw: 'Aina' },
  'exp.description': { en: 'Description', sw: 'Maelezo' },
  'exp.date': { en: 'Date', sw: 'Tarehe' },
  'exp.food': { en: 'Food', sw: 'Chakula' },
  'exp.transport': { en: 'Usafiri', sw: 'Usafiri' },
  'exp.rent': { en: 'Rent', sw: 'Kodi' },
  'exp.utilities': { en: 'Utilities', sw: 'Huduma' },
  'exp.entertainment': { en: 'Entertainment', sw: 'Burudani' },
  'exp.education': { en: 'Education', sw: 'Elimu' },
  'exp.business': { en: 'Business', sw: 'Biashara' },
  'exp.other': { en: 'Other', sw: 'Nyingine' },
  // Budget
  'bud.monthly': { en: 'Monthly Budget', sw: 'Bajeti ya Mwezi' },
  'bud.spent': { en: 'Spent', sw: 'Imetumika' },
  'bud.remaining': { en: 'Remaining', sw: 'Iliyobaki' },
  'bud.limit': { en: 'Limit', sw: 'Kikomo' },
  // Savings
  'sav.goals': { en: 'Savings Goals', sw: 'Malengo ya Akiba' },
  'sav.target': { en: 'Target', sw: 'Lengo' },
  'sav.saved': { en: 'Saved', sw: 'Imehifadhiwa' },
  'sav.add': { en: 'Add Goal', sw: 'Ongeza Lengo' },
  // Advisor
  'adv.title': { en: 'AI Financial Advisor', sw: 'Mshauri wa Fedha AI' },
  'adv.placeholder': { en: 'Ask about your finances...', sw: 'Uliza kuhusu fedha zako...' },
  'adv.send': { en: 'Send', sw: 'Tuma' },
  // General
  'gen.tzs': { en: 'TZS', sw: 'TSh' },
  'gen.save': { en: 'Save', sw: 'Hifadhi' },
  'gen.cancel': { en: 'Cancel', sw: 'Ghairi' },
  'gen.settings': { en: 'Settings', sw: 'Mipangilio' },
  'gen.language': { en: 'Language', sw: 'Lugha' },
  'gen.debt': { en: 'Debts', sw: 'Madeni' },
};

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
});

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('pesasmart-lang');
    return (saved === 'sw' ? 'sw' : 'en') as Lang;
  });

  const changeLang = useCallback((l: Lang) => {
    setLang(l);
    localStorage.setItem('pesasmart-lang', l);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[lang] || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
