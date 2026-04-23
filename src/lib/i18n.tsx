import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Lang = 'en' | 'sw';

const translations: Record<string, Record<Lang, string>> = {
  // ============ Nav ============
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
  'nav.reports': { en: 'Reports', sw: 'Ripoti' },
  'nav.sms': { en: 'SMS Parser', sw: 'Soma SMS' },
  'nav.invest': { en: 'Invest', sw: 'Wekeza' },
  'nav.more': { en: 'More', sw: 'Zaidi' },

  // ============ Dashboard ============
  'dash.greeting': { en: 'Hello', sw: 'Habari' },
  'dash.balance': { en: 'Total Balance', sw: 'Salio Jumla' },
  'dash.income': { en: 'Income', sw: 'Mapato' },
  'dash.expenses': { en: 'Expenses', sw: 'Matumizi' },
  'dash.savings': { en: 'Savings', sw: 'Akiba' },
  'dash.health': { en: 'Financial Health', sw: 'Hali ya Fedha' },
  'dash.insights': { en: 'AI Insights', sw: 'Maarifa ya AI' },
  'dash.recent': { en: 'Recent Transactions', sw: 'Miamala ya Hivi Karibuni' },
  'dash.quickAdd': { en: 'Quick Add', sw: 'Ongeza Haraka' },
  'dash.incomeVsExp': { en: 'Income vs Expenses', sw: 'Mapato dhidi ya Matumizi' },
  'dash.noTx': { en: 'No transactions yet. Add your first one!', sw: 'Hakuna miamala bado. Ongeza ya kwanza!' },
  'dash.health.great': { en: 'Great', sw: 'Bora' },
  'dash.health.good': { en: 'Good', sw: 'Nzuri' },
  'dash.health.fair': { en: 'Fair', sw: 'Wastani' },
  'dash.health.low': { en: 'Low', sw: 'Chini' },
  'dash.quick.amount': { en: 'Quick amount (TZS)', sw: 'Kiasi cha haraka (TZS)' },
  'dash.quick.custom': { en: 'Or enter custom amount (TZS)', sw: 'Au weka kiasi maalum (TZS)' },
  'dash.quick.descOpt': { en: 'Description (optional)', sw: 'Maelezo (si lazima)' },
  'dash.quick.add': { en: 'Add', sw: 'Ongeza' },
  'dash.quick.saving': { en: 'Saving...', sw: 'Inahifadhi...' },
  'dash.type.expense': { en: 'Expense', sw: 'Matumizi' },
  'dash.type.income': { en: 'Income', sw: 'Mapato' },

  // ============ Expenses ============
  'exp.add': { en: 'Add Expense', sw: 'Ongeza Matumizi' },
  'exp.amount': { en: 'Amount', sw: 'Kiasi' },
  'exp.category': { en: 'Category', sw: 'Aina' },
  'exp.description': { en: 'Description', sw: 'Maelezo' },
  'exp.date': { en: 'Date', sw: 'Tarehe' },
  'exp.food': { en: 'Food', sw: 'Chakula' },
  'exp.transport': { en: 'Transport', sw: 'Usafiri' },
  'exp.rent': { en: 'Rent', sw: 'Kodi' },
  'exp.utilities': { en: 'Utilities', sw: 'Huduma' },
  'exp.entertainment': { en: 'Entertainment', sw: 'Burudani' },
  'exp.education': { en: 'Education', sw: 'Elimu' },
  'exp.business': { en: 'Business', sw: 'Biashara' },
  'exp.other': { en: 'Other', sw: 'Nyingine' },
  'exp.all': { en: 'All', sw: 'Zote' },
  'exp.search': { en: 'Search transactions...', sw: 'Tafuta miamala...' },
  'exp.from': { en: 'From date', sw: 'Tarehe ya kuanzia' },
  'exp.to': { en: 'To date', sw: 'Tarehe ya mwisho' },
  'exp.clear': { en: 'Clear filters', sw: 'Futa vichujio' },
  'exp.found': { en: 'transactions found', sw: 'miamala imepatikana' },
  'exp.found1': { en: 'transaction found', sw: 'muamala umepatikana' },
  'exp.noTx': { en: 'No transactions yet', sw: 'Hakuna miamala' },
  'exp.select': { en: 'Select', sw: 'Chagua' },
  'exp.selected': { en: 'selected', sw: 'zimechaguliwa' },
  'exp.selectAll': { en: 'Select all', sw: 'Chagua zote' },
  'exp.deselectAll': { en: 'Deselect all', sw: 'Acha zote' },
  'exp.delete': { en: 'Delete', sw: 'Futa' },
  'exp.breakdown': { en: 'Spending Breakdown', sw: 'Mchanganuo wa Matumizi' },
  'exp.txAdded': { en: 'Transaction added!', sw: 'Muamala umeongezwa!' },
  'exp.txUpdated': { en: 'Transaction updated!', sw: 'Muamala umesasishwa!' },
  'exp.txDeleted': { en: 'Transaction deleted!', sw: 'Muamala umefutwa!' },

  // ============ Budget ============
  'bud.monthly': { en: 'Budget', sw: 'Bajeti' },
  'bud.spent': { en: 'Spent', sw: 'Imetumika' },
  'bud.remaining': { en: 'Remaining', sw: 'Iliyobaki' },
  'bud.limit': { en: 'Limit', sw: 'Kikomo' },
  'bud.daily': { en: 'Daily', sw: 'Kila siku' },
  'bud.weekly': { en: 'Weekly', sw: 'Kila wiki' },
  'bud.monthlyP': { en: 'Monthly', sw: 'Kila mwezi' },
  'bud.income': { en: 'Income', sw: 'Mapato' },
  'bud.addCategory': { en: 'Add Budget Category', sw: 'Ongeza Aina ya Bajeti' },
  'bud.editCategory': { en: 'Edit Budget Category', sw: 'Hariri Aina ya Bajeti' },
  'bud.categoryName': { en: 'Category name', sw: 'Jina la aina' },
  'bud.limitTzs': { en: 'Limit (TZS)', sw: 'Kikomo (TZS)' },
  'bud.add': { en: 'Add', sw: 'Ongeza' },
  'bud.save': { en: 'Save', sw: 'Hifadhi' },
  'bud.update': { en: 'Update', sw: 'Sasisha' },
  'bud.empty': { en: 'No category budgets yet', sw: 'Hakuna bajeti za aina bado' },
  'bud.emptyHint': { en: 'Tap "Add" above to set spending limits per category', sw: 'Bonyeza "Ongeza" kuweka vikomo kwa kila aina' },
  'bud.categories': { en: 'Category Budgets', sw: 'Bajeti za Aina' },
  'bud.almostLimit': { en: 'Almost at limit', sw: 'Karibu kufikia kikomo' },
  'bud.exceeds': { en: 'Spending exceeds income for this period', sw: 'Matumizi yamezidi mapato kwa kipindi hiki' },
  'bud.ofIncome': { en: 'of income spent', sw: 'ya mapato yametumika' },
  'bud.addIncomeHint': { en: 'Add income transactions to track your remaining balance', sw: 'Ongeza mapato kufuatilia salio lako' },

  // ============ Bills ============
  'bills.title': { en: 'Bill Reminders', sw: 'Vikumbusho vya Bili' },
  'bills.addBill': { en: 'Add Bill', sw: 'Ongeza Bili' },
  'bills.monthly': { en: 'Monthly Bills', sw: 'Bili za Mwezi' },
  'bills.paid': { en: 'Paid', sw: 'Zimelipwa' },
  'bills.overdue': { en: 'Overdue', sw: 'Zilizochelewa' },
  'bills.upcoming': { en: 'Upcoming', sw: 'Zinazokuja' },
  'bills.paidThisMonth': { en: 'Paid This Month', sw: 'Zimelipwa Mwezi Huu' },
  'bills.empty': { en: 'No bill reminders yet. Add your recurring bills to stay on track!', sw: 'Hakuna vikumbusho. Ongeza bili zako za mara kwa mara!' },
  'bills.name': { en: 'Bill name', sw: 'Jina la bili' },
  'bills.amountTzs': { en: 'Amount (TZS)', sw: 'Kiasi (TZS)' },
  'bills.dueDay': { en: 'Due day of month', sw: 'Siku ya mwezi inayostahili' },
  'bills.editBill': { en: 'Edit Bill', sw: 'Hariri Bili' },
  'bills.addReminder': { en: 'Add Bill Reminder', sw: 'Ongeza Kikumbusho cha Bili' },

  // ============ Savings ============
  'sav.goals': { en: 'Savings Goals', sw: 'Malengo ya Akiba' },
  'sav.target': { en: 'Target', sw: 'Lengo' },
  'sav.saved': { en: 'Saved', sw: 'Imehifadhiwa' },
  'sav.add': { en: 'Add Goal', sw: 'Ongeza Lengo' },
  'sav.empty': { en: 'No savings goals yet', sw: 'Hakuna malengo ya akiba' },
  'sav.progress': { en: 'Progress', sw: 'Maendeleo' },

  // ============ Debts ============
  'debt.title': { en: 'Debts', sw: 'Madeni' },
  'debt.add': { en: 'Add Debt', sw: 'Ongeza Deni' },
  'debt.total': { en: 'Total Owed', sw: 'Jumla ya Deni' },
  'debt.remaining': { en: 'Remaining', sw: 'Iliyobaki' },
  'debt.paid': { en: 'Paid Off', sw: 'Imelipwa' },
  'debt.empty': { en: 'No debts tracked. Add a loan or credit to track repayments.', sw: 'Hakuna madeni. Ongeza mkopo kufuatilia malipo.' },

  // ============ Investments ============
  'inv.title': { en: 'Investments', sw: 'Uwekezaji' },
  'inv.simulator': { en: 'Return Simulator', sw: 'Kiigaji cha Mapato' },
  'inv.simHint': { en: 'Enter amount & years, then tap an investment below to calculate returns.', sw: 'Weka kiasi na miaka, kisha bonyeza uwekezaji hapo chini kukokotoa mapato.' },
  'inv.amountTzs': { en: 'Amount (TZS)', sw: 'Kiasi (TZS)' },
  'inv.years': { en: 'Years', sw: 'Miaka' },
  'inv.tapHint': { en: '👇 Tap an investment below to see your returns', sw: '👇 Bonyeza uwekezaji chini kuona mapato yako' },
  'inv.tapCalc': { en: 'Tap to calculate →', sw: 'Bonyeza kukokotoa →' },
  'inv.conservative': { en: 'Conservative', sw: 'Cha hadhari' },
  'inv.optimistic': { en: 'Optimistic', sw: 'Cha matumaini' },
  'inv.rate': { en: 'Rate', sw: 'Kiwango' },
  'inv.min': { en: 'Min', sw: 'Cha chini' },
  'inv.risk.low': { en: 'Low', sw: 'Chini' },
  'inv.risk.medium': { en: 'Medium', sw: 'Wastani' },
  'inv.risk.high': { en: 'High', sw: 'Juu' },
  'inv.risk.all': { en: 'All', sw: 'Zote' },
  'inv.risk.suffix': { en: 'Risk', sw: 'Hatari' },

  // ============ Reports ============
  'rep.title': { en: 'Reports', sw: 'Ripoti' },
  'rep.monthly': { en: 'Monthly Overview', sw: 'Muhtasari wa Mwezi' },
  'rep.netSavings': { en: 'Net Savings Trend', sw: 'Mwelekeo wa Akiba Halisi' },
  'rep.byCategory': { en: 'Spending by Category', sw: 'Matumizi kwa Aina' },
  'rep.weekly': { en: 'Weekly Spending', sw: 'Matumizi ya Wiki' },
  'rep.byDay': { en: 'Avg Spending by Day', sw: 'Wastani wa Matumizi kwa Siku' },
  'rep.aiPredict': { en: 'AI Financial Predictions', sw: 'Utabiri wa Fedha wa AI' },
  'rep.analyzing': { en: 'Analyzing your data...', sw: 'Inachanganua data yako...' },
  'rep.predictedNext': { en: 'Predicted Next Month', sw: 'Inakadiriwa Mwezi Ujao' },
  'rep.catForecast': { en: 'Category Forecast', sw: 'Utabiri wa Aina' },
  'rep.anomalies': { en: 'Anomalies Detected', sw: 'Hitilafu Zimegunduliwa' },
  'rep.refresh': { en: 'Refresh predictions', sw: 'Sasisha utabiri' },
  'rep.unlockHint': { en: 'Add at least 5 transactions to unlock AI predictions', sw: 'Ongeza miamala 5 kufungua utabiri wa AI' },
  'rep.generate': { en: 'Generate Predictions', sw: 'Tengeneza Utabiri' },
  'rep.loading': { en: 'Loading...', sw: 'Inapakia...' },
  'rep.noData': { en: 'No transaction data for this period. Add transactions to see reports!', sw: 'Hakuna data ya kipindi hiki. Ongeza miamala kuona ripoti!' },
  'rep.trend.increasing': { en: 'Increasing', sw: 'Inaongezeka' },
  'rep.trend.decreasing': { en: 'Decreasing', sw: 'Inapungua' },
  'rep.trend.stable': { en: 'Stable', sw: 'Imara' },

  // ============ Advisor ============
  'adv.title': { en: 'AI Financial Advisor', sw: 'Mshauri wa Fedha AI' },
  'adv.placeholder': { en: 'Ask about your finances...', sw: 'Uliza kuhusu fedha zako...' },
  'adv.send': { en: 'Send', sw: 'Tuma' },
  'adv.history': { en: 'History', sw: 'Historia' },
  'adv.clearAll': { en: 'Clear All', sw: 'Futa Zote' },
  'adv.thinking': { en: 'Thinking...', sw: 'Inafikiri...' },
  'adv.welcome': { en: 'Hi! I\'m your AI financial advisor. Ask me anything about your finances.', sw: 'Habari! Mimi ni mshauri wako wa fedha wa AI. Niulize chochote.' },

  // ============ Tax ============
  'tax.title': { en: 'Tax Calculator', sw: 'Kikokotoo cha Kodi' },
  'tax.salary': { en: 'Salary (PAYE)', sw: 'Mshahara (PAYE)' },
  'tax.business': { en: 'Business', sw: 'Biashara' },
  'tax.gross': { en: 'Gross Salary (TZS)', sw: 'Mshahara wa Jumla (TZS)' },
  'tax.revenue': { en: 'Annual Revenue (TZS)', sw: 'Mapato ya Mwaka (TZS)' },
  'tax.calc': { en: 'Calculate', sw: 'Kokotoa' },
  'tax.payable': { en: 'Tax Payable', sw: 'Kodi ya Kulipwa' },
  'tax.net': { en: 'Net Income', sw: 'Mapato Halisi' },

  // ============ SMS Parser ============
  'sms.title': { en: 'SMS Parser', sw: 'Soma SMS' },
  'sms.placeholder': { en: 'Paste M-Pesa, Tigo Pesa or Airtel Money SMS here...', sw: 'Bandika SMS ya M-Pesa, Tigo Pesa au Airtel Money hapa...' },
  'sms.parse': { en: 'Parse SMS', sw: 'Soma SMS' },
  'sms.parsing': { en: 'Parsing...', sw: 'Inasoma...' },
  'sms.saveAll': { en: 'Save All', sw: 'Hifadhi Zote' },

  // ============ Settings ============
  'set.title': { en: 'Settings', sw: 'Mipangilio' },
  'set.profile': { en: 'Profile', sw: 'Wasifu' },
  'set.fullName': { en: 'Full Name', sw: 'Jina Kamili' },
  'set.phone': { en: 'Phone', sw: 'Simu' },
  'set.language': { en: 'Language', sw: 'Lugha' },
  'set.currency': { en: 'Currency', sw: 'Sarafu' },
  'set.theme': { en: 'Theme', sw: 'Mandhari' },
  'set.theme.light': { en: 'Light', sw: 'Mchana' },
  'set.theme.dark': { en: 'Dark', sw: 'Usiku' },
  'set.theme.system': { en: 'System', sw: 'Mfumo' },
  'set.notifications': { en: 'Notifications', sw: 'Arifa' },
  'set.signOut': { en: 'Sign Out', sw: 'Toka' },
  'set.saved': { en: 'Settings saved!', sw: 'Mipangilio imehifadhiwa!' },
  'set.update': { en: 'Save Changes', sw: 'Hifadhi Mabadiliko' },

  // ============ Auth ============
  'auth.login': { en: 'Login', sw: 'Ingia' },
  'auth.signup': { en: 'Sign Up', sw: 'Jisajili' },
  'auth.fullName': { en: 'Full Name', sw: 'Jina Kamili' },
  'auth.email': { en: 'Email', sw: 'Barua pepe' },
  'auth.password': { en: 'Password', sw: 'Nenosiri' },
  'auth.forgot': { en: 'Forgot password?', sw: 'Umesahau nenosiri?' },
  'auth.sendReset': { en: 'Send Reset Link', sw: 'Tuma Kiungo cha Kuweka Upya' },
  'auth.loginBtn': { en: 'Log In', sw: 'Ingia' },
  'auth.createAccount': { en: 'Create Account', sw: 'Fungua Akaunti' },
  'auth.wait': { en: 'Please wait...', sw: 'Tafadhali subiri...' },
  'auth.backLogin': { en: 'Back to Login', sw: 'Rudi Kuingia' },
  'auth.checkEmail': { en: 'Check your email to confirm your account!', sw: 'Angalia barua pepe yako kuthibitisha akaunti!' },
  'auth.resetSent': { en: 'Password reset email sent! Check your inbox.', sw: 'Barua ya kuweka upya nenosiri imetumwa!' },
  'auth.resetHint': { en: 'We sent a reset link to', sw: 'Tumetuma kiungo cha kuweka upya kwa' },
  'auth.tagline': { en: 'AI-powered financial planning', sw: 'Mipango ya fedha kwa AI' },
  'auth.nameRequired': { en: 'Please enter your name', sw: 'Tafadhali weka jina lako' },

  // ============ Common ============
  'gen.tzs': { en: 'TZS', sw: 'TSh' },
  'gen.save': { en: 'Save', sw: 'Hifadhi' },
  'gen.cancel': { en: 'Cancel', sw: 'Ghairi' },
  'gen.delete': { en: 'Delete', sw: 'Futa' },
  'gen.edit': { en: 'Edit', sw: 'Hariri' },
  'gen.confirm': { en: 'Confirm', sw: 'Thibitisha' },
  'gen.settings': { en: 'Settings', sw: 'Mipangilio' },
  'gen.language': { en: 'Language', sw: 'Lugha' },
  'gen.debt': { en: 'Debts', sw: 'Madeni' },
  'gen.loading': { en: 'Loading...', sw: 'Inapakia...' },
  'gen.saving': { en: 'Saving...', sw: 'Inahifadhi...' },
  'gen.offline': { en: "You're offline. Transactions will sync when you're back online.", sw: 'Huko mtandaoni. Miamala itasawazishwa ukirudi mtandaoni.' },
  'gen.deleteConfirm': { en: 'Are you sure?', sw: 'Una uhakika?' },
  'gen.permanent': { en: 'This action cannot be undone.', sw: 'Kitendo hiki hakiwezi kutenduliwa.' },
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
    // Set <html lang> attribute for accessibility/SEO
    document.documentElement.lang = l;
  }, []);

  // Initialize <html lang> on first render
  React.useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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
