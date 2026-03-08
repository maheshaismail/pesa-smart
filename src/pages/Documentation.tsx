import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    title: '1. Overview',
    content: `PesaSmart is a comprehensive personal finance management application built for Tanzanian users. It helps you track income & expenses, manage budgets, set savings goals, monitor debts, handle bill reminders, and get AI-powered financial advice — all in Tanzanian Shillings (TZS).

Key highlights:
• Progressive Web App (PWA) — install on any device
• Works offline with automatic sync
• Supports English and Swahili (Kiswahili)
• Dark and light theme support
• SMS parsing for all Tanzanian mobile money networks`,
  },
  {
    title: '2. Getting Started',
    content: `2.1 Sign Up & Login
• Open the app and create an account using your email address.
• Verify your email via the confirmation link sent to your inbox.
• Log in with your credentials.

2.2 Forgot Password
• Click "Forgot password?" on the login screen.
• Enter your email to receive a password reset link.
• Follow the link to set a new password.

2.3 Install as App (PWA)
• On mobile: Tap "Add to Home Screen" when prompted.
• On desktop: Click the install icon in your browser's address bar.`,
  },
  {
    title: '3. Dashboard',
    content: `The Dashboard provides a quick snapshot of your financial health:

• Total Balance — Your net income minus expenses for the current month.
• Income & Expenses — Monthly totals at a glance.
• Financial Health Score — A 0–100 score based on your savings rate and spending habits.
• AI Insights — Smart recommendations based on your spending patterns.
• Recent Transactions — Your latest 5 transactions for quick review.`,
  },
  {
    title: '4. Expenses / Transactions',
    content: `4.1 Adding Transactions
• Tap "+ Add Expense" to record income or expenses.
• Fill in: Amount, Category, Description, and Type (income/expense).
• Transactions are saved with today's date by default.

4.2 SMS Parsing
• Paste a mobile money SMS and the app auto-fills transaction details.
• Alternatively, use the dedicated SMS Parser page for bulk parsing.

4.3 Editing & Deleting
• Tap the pencil icon (✏️) on any transaction to edit it.
• Tap the trash icon (🗑️) to delete with confirmation.
• Use "Select" mode for bulk deletion of multiple transactions.

4.4 Filtering & Search
• Filter by type: All, Income, or Expense.
• Use the search bar to find transactions by description, category, or amount.
• Filter by date range using the date pickers.

4.5 Spending Breakdown
• A pie chart shows your expense distribution by category.`,
  },
  {
    title: '5. Budget Management',
    content: `5.1 Setting Up Budgets
• Go to Budget and tap "+ Add" to create a budget category.
• Set the category name, icon, and monthly spending limit (TZS).
• Or tap "Set Up Default Budgets" for common categories (Food, Transport, Rent, etc.).

5.2 Tracking Spending
• Each category shows a progress bar: spent vs. limit.
• Categories at 90%+ usage show a warning indicator.
• The top summary card shows total spending vs. total budget.

5.3 Editing & Deleting
• Tap ✏️ to edit the limit or icon of any budget category.
• Tap 🗑️ to delete a category with confirmation.`,
  },
  {
    title: '6. Savings Goals',
    content: `6.1 Creating Goals
• Go to Savings and tap "+ Add Goal".
• Set a name, target amount, icon, and optional deadline.

6.2 Adding Savings (Deposits)
• On each goal card, tap "Add Savings" to deposit money.
• Choose from quick amounts (5K, 10K, 25K, 50K, 100K TZS) or enter custom.
• A live preview shows your progress after the deposit.

6.3 Withdrawing
• Tap "Withdraw" to reduce the saved amount if needed.

6.4 Tracking Progress
• Each goal shows a progress bar and percentage.
• Goals at 100% show a ✅ Done badge.
• The top summary shows total saved across all goals.

6.5 Editing & Deleting
• Tap ✏️ to edit goal details or manually adjust saved amount.
• Tap 🗑️ to delete a goal.`,
  },
  {
    title: '7. Bill Reminders',
    content: `7.1 Adding Bills
• Go to Bills and tap "+ Add Bill".
• Set: Bill name, amount, category, icon, and due day of month.

7.2 Bill Status
• Bills are grouped: Overdue (past due day, unpaid), Upcoming (future due day), and Paid.
• Tap the checkbox to mark a bill as paid/unpaid.

7.3 Summary
• Monthly total, paid count, and overdue count are shown at the top.

7.4 Editing & Deleting
• Tap ✏️ to edit bill details.
• Tap 🗑️ to delete a bill with confirmation.`,
  },
  {
    title: '8. Debt Tracker',
    content: `8.1 Adding Debts
• Go to Debts and tap "+ Add Debt".
• Fill in: Name, lender, type (personal/bank/mobile/business), total amount, remaining amount, interest rate, monthly payment, and due date.

8.2 Tracking Progress
• Each debt shows percentage paid off with a progress bar.
• Estimated months remaining based on monthly payment.
• Interest rate and monthly payment details are displayed.

8.3 Summary
• Total outstanding debt and overall payoff percentage shown at top.

8.4 Editing & Deleting
• Tap ✏️ to update remaining amount or other details.
• Tap 🗑️ to delete a debt record.`,
  },
  {
    title: '9. SMS Parser',
    content: `The SMS Parser extracts transaction data from mobile money SMS messages.

Supported Networks:
• M-Pesa (Vodacom)
• Airtel Money
• Tigo Pesa (Yas/MIX)
• HaloPesa (Halotel)
• EzyPesa (Zantel)
• TTCL Pesa

How to Use:
1. Go to SMS Parser.
2. Paste your mobile money SMS message.
3. Tap "Parse SMS" — the app detects the network, amount, type, and category.
4. Review and save as a transaction.

The parser supports both English and Swahili SMS formats.`,
  },
  {
    title: '10. AI Financial Advisor',
    content: `• Go to AI Advisor to chat with an AI-powered financial assistant.
• Ask questions about budgeting, saving strategies, debt management, or investment advice.
• The advisor is tailored for Tanzanian financial context (TZS, local services).
• Chat history is saved for future reference.`,
  },
  {
    title: '11. Reports',
    content: `• View detailed financial reports and analytics.
• Charts and graphs visualize your income, expenses, and trends over time.
• Helpful for understanding spending patterns and making informed decisions.`,
  },
  {
    title: '12. Settings',
    content: `• Language: Switch between English and Kiswahili.
• Theme: Toggle between light, dark, or system theme.
• Profile: Update your name and phone number.
• Currency: Set your preferred currency (default: TZS).
• Account: Sign out or manage your account.`,
  },
  {
    title: '13. Offline Support',
    content: `PesaSmart works offline:
• Transactions saved offline are stored locally on your device.
• When you reconnect to the internet, they sync automatically to the cloud.
• An indicator shows when you are offline.`,
  },
  {
    title: '14. Security & Privacy',
    content: `• All data is stored securely in the cloud with row-level security.
• Each user can only access their own data.
• Passwords are securely hashed — never stored in plain text.
• Email verification is required before first login.`,
  },
  {
    title: '15. Technical Specifications',
    content: `• Frontend: React 18, TypeScript, Tailwind CSS, Framer Motion
• Backend: Lovable Cloud (Supabase) — PostgreSQL database, Edge Functions, Authentication
• Charts: Recharts
• PWA: Vite PWA Plugin with service worker
• State Management: TanStack React Query
• Routing: React Router v6
• AI: Lovable AI (Gemini / GPT models)`,
  },
];

const Documentation = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Screen-only header */}
      <div className="print:hidden pb-24 pt-2 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold font-display">App Documentation</h1>
          </div>
          <Button onClick={handlePrint} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
            <Download size={16} /> Download PDF
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Complete documentation for PesaSmart. Click "Download PDF" to save — your browser's print dialog will open, choose "Save as PDF" as the destination.
        </p>

        {sections.map((section, i) => (
          <div key={i} className="rounded-xl bg-card p-5 shadow-card space-y-2">
            <h2 className="text-base font-bold font-display">{section.title}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{section.content}</p>
          </div>
        ))}

        <div className="rounded-xl bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">PesaSmart © {new Date().getFullYear()} — All rights reserved</p>
          <p className="text-xs text-muted-foreground mt-1">Built with Lovable</p>
        </div>
      </div>

      {/* Print-only version */}
      <div className="hidden print:block">
        <style>{`
          @media print {
            body { font-family: 'Segoe UI', sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.6; }
            nav, footer, .print\\:hidden { display: none !important; }
            .print-section { page-break-inside: avoid; margin-bottom: 18pt; }
            h1 { font-size: 22pt; margin-bottom: 6pt; }
            h2 { font-size: 14pt; margin-bottom: 4pt; border-bottom: 1px solid #ddd; padding-bottom: 4pt; }
            p { margin-bottom: 8pt; }
          }
        `}</style>
        <h1 style={{ textAlign: 'center', marginBottom: 4 }}>PesaSmart Documentation</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 24 }}>Personal Finance Manager for Tanzania</p>
        {sections.map((section, i) => (
          <div key={i} className="print-section">
            <h2>{section.title}</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{section.content}</p>
          </div>
        ))}
        <p style={{ textAlign: 'center', color: '#999', marginTop: 32, fontSize: '9pt' }}>
          PesaSmart © {new Date().getFullYear()} — Generated on {new Date().toLocaleDateString()}
        </p>
      </div>
    </>
  );
};

export default Documentation;
