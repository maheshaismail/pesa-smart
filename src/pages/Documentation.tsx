import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const userGuideSections = [
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

const srsSections = [
  {
    title: '1. Introduction',
    content: `1.1 Purpose
This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for PesaSmart — a personal finance management Progressive Web Application (PWA) designed for users in Tanzania.

1.2 Scope
PesaSmart enables individuals to manage their personal finances including income tracking, expense management, budgeting, savings goal tracking, debt management, bill reminders, and AI-powered financial advisory. The system supports Tanzanian Shillings (TZS) as the primary currency and integrates with all major Tanzanian mobile money networks via SMS parsing.

1.3 Definitions, Acronyms, and Abbreviations
• PWA — Progressive Web Application
• TZS — Tanzanian Shilling
• CRUD — Create, Read, Update, Delete
• RLS — Row-Level Security
• SMS — Short Message Service
• API — Application Programming Interface
• AI — Artificial Intelligence
• UI — User Interface
• UX — User Experience

1.4 References
• IEEE 830-1998 Standard for SRS
• Supabase Documentation
• React 18 Documentation
• PWA Web Standards (W3C)

1.5 Overview
This document is organized into sections covering overall description, specific requirements, system features, external interface requirements, and non-functional requirements.`,
  },
  {
    title: '2. Overall Description',
    content: `2.1 Product Perspective
PesaSmart is a standalone web-based application accessible via modern web browsers. It operates as a PWA, enabling installation on mobile and desktop devices. The system uses a cloud-based backend for data persistence, authentication, and serverless functions.

2.2 Product Functions
The major functions of PesaSmart include:
• F1: User Authentication (sign up, login, password reset, email verification)
• F2: Transaction Management (income/expense CRUD with search, filter, bulk operations)
• F3: Budget Management (category-based monthly budget limits with tracking)
• F4: Savings Goal Tracking (goal creation, deposit/withdrawal, progress visualization)
• F5: Debt Management (loan tracking with interest rates, payment schedules)
• F6: Bill Reminders (recurring bill tracking with due dates, paid/overdue status)
• F7: SMS Parsing (automatic transaction extraction from mobile money SMS)
• F8: AI Financial Advisor (chat-based financial guidance)
• F9: Financial Reports (charts, analytics, spending breakdowns)
• F10: Settings & Preferences (language, theme, profile, currency)
• F11: Offline Support (local storage with auto-sync)

2.3 User Classes and Characteristics
• Primary Users: Tanzanian individuals managing personal finances
• Assumed Skills: Basic smartphone/computer usage, familiarity with mobile money
• Language: English and Swahili (Kiswahili)

2.4 Operating Environment
• Client: Modern web browsers (Chrome, Safari, Firefox, Edge)
• Server: Supabase (PostgreSQL, Edge Functions, Auth, Storage)
• Devices: Smartphones, tablets, desktop computers
• Network: Works online and offline (PWA with service worker)

2.5 Design and Implementation Constraints
• Must operate as a PWA with offline capability
• Must support TZS currency formatting
• Must comply with Supabase RLS for data security
• Must support English and Swahili languages
• Frontend limited to React/TypeScript ecosystem

2.6 Assumptions and Dependencies
• Users have access to a web browser
• Users have email addresses for registration
• Mobile money SMS messages follow standard Tanzanian network formats
• Internet connectivity is available for initial setup and periodic sync`,
  },
  {
    title: '3. Specific Requirements — Functional',
    content: `3.1 Authentication Module (F1)
FR-1.1: The system shall allow users to register with email and password.
FR-1.2: The system shall send email verification upon registration.
FR-1.3: The system shall allow users to log in with verified credentials.
FR-1.4: The system shall provide "Forgot Password" functionality via email.
FR-1.5: The system shall allow users to reset their password via a secure link.
FR-1.6: The system shall maintain persistent sessions with auto-refresh tokens.

3.2 Transaction Management (F2)
FR-2.1: The system shall allow users to create transactions with amount, type (income/expense), category, description, and date.
FR-2.2: The system shall display transactions in reverse chronological order.
FR-2.3: The system shall allow editing of existing transactions.
FR-2.4: The system shall allow deletion of transactions with confirmation dialog.
FR-2.5: The system shall support bulk selection and deletion of transactions.
FR-2.6: The system shall support filtering by type (all/income/expense).
FR-2.7: The system shall support text search across description, category, and amount.
FR-2.8: The system shall support date range filtering.
FR-2.9: The system shall display a pie chart of expense distribution by category.
FR-2.10: The system shall support swipe-to-delete gesture on mobile.
FR-2.11: The system shall allow SMS text input for automatic transaction parsing.

3.3 Budget Management (F3)
FR-3.1: The system shall allow users to create budget categories with name, icon, and monthly limit.
FR-3.2: The system shall track spending per category against the set limit.
FR-3.3: The system shall display progress bars for each category.
FR-3.4: The system shall warn when spending exceeds 90% of budget limit.
FR-3.5: The system shall show total spending vs. total budget summary.
FR-3.6: The system shall allow editing and deleting budget categories.
FR-3.7: The system shall provide default budget templates.

3.4 Savings Goal Tracking (F4)
FR-4.1: The system shall allow users to create savings goals with name, target amount, icon, and deadline.
FR-4.2: The system shall allow users to add deposits to savings goals.
FR-4.3: The system shall allow users to withdraw from savings goals.
FR-4.4: The system shall provide quick deposit amounts (5K, 10K, 25K, 50K, 100K TZS).
FR-4.5: The system shall show live preview of progress after deposit/withdrawal.
FR-4.6: The system shall display progress percentage and remaining amount.
FR-4.7: The system shall mark goals as complete at 100%.
FR-4.8: The system shall allow editing and deleting savings goals.

3.5 Debt Management (F5)
FR-5.1: The system shall allow users to add debts with name, lender, type, amounts, interest rate, monthly payment, and due date.
FR-5.2: The system shall calculate and display payoff percentage.
FR-5.3: The system shall estimate remaining months based on monthly payment.
FR-5.4: The system shall show total outstanding debt summary.
FR-5.5: The system shall allow editing and deleting debt records.

3.6 Bill Reminders (F6)
FR-6.1: The system shall allow users to add recurring bills with name, amount, category, icon, and due day.
FR-6.2: The system shall categorize bills as overdue, upcoming, or paid.
FR-6.3: The system shall allow toggling bill paid/unpaid status.
FR-6.4: The system shall show monthly bill summary with paid count and overdue count.
FR-6.5: The system shall allow editing and deleting bill reminders.

3.7 SMS Parser (F7)
FR-7.1: The system shall parse SMS messages from M-Pesa, Airtel Money, Tigo Pesa, HaloPesa, EzyPesa, and TTCL Pesa.
FR-7.2: The system shall extract transaction amount, type, and category from SMS.
FR-7.3: The system shall support both English and Swahili SMS formats.
FR-7.4: The system shall detect the mobile money network from SMS content.
FR-7.5: The system shall allow saving parsed data as transactions.

3.8 AI Financial Advisor (F8)
FR-8.1: The system shall provide a chat interface for financial questions.
FR-8.2: The system shall generate AI responses tailored to Tanzanian financial context.
FR-8.3: The system shall persist chat history per user.

3.9 Reports (F9)
FR-9.1: The system shall display financial charts and analytics.
FR-9.2: The system shall show income vs. expense trends.

3.10 Settings (F10)
FR-10.1: The system shall allow switching between English and Kiswahili.
FR-10.2: The system shall support light, dark, and system theme modes.
FR-10.3: The system shall allow profile updates (name, phone).`,
  },
  {
    title: '4. External Interface Requirements',
    content: `4.1 User Interfaces
• Mobile-first responsive design with bottom navigation bar
• Card-based layout with rounded corners and subtle shadows
• Bottom sheet modals for data entry forms
• Animated transitions using Framer Motion
• Color-coded indicators (green for income/success, red for expenses/warnings)
• Pie charts and progress bars for data visualization

4.2 Hardware Interfaces
• No direct hardware interfaces required
• Standard web browser capabilities (touch, keyboard, mouse)
• Camera access not required

4.3 Software Interfaces
• Supabase PostgreSQL — Data storage and queries
• Supabase Auth — User authentication and session management
• Supabase Edge Functions — SMS parsing, AI advisor, spending insights, financial predictions
• Lovable AI API — AI model access (Gemini, GPT) for financial advisory
• Browser Service Worker — PWA offline caching

4.4 Communication Interfaces
• HTTPS for all client-server communication
• WebSocket (Supabase Realtime) for live data updates
• REST API for Edge Function invocations
• IndexedDB for offline local storage`,
  },
  {
    title: '5. Non-Functional Requirements',
    content: `5.1 Performance Requirements
NFR-1: Pages shall load within 3 seconds on 3G network.
NFR-2: Transaction list shall handle up to 1,000 records without UI degradation.
NFR-3: SMS parsing shall return results within 5 seconds.
NFR-4: AI advisor shall respond within 15 seconds.

5.2 Security Requirements
NFR-5: All database tables shall enforce Row-Level Security (RLS) policies.
NFR-6: Users shall only access their own data — enforced at database level.
NFR-7: Passwords shall be hashed using bcrypt (handled by Supabase Auth).
NFR-8: Email verification shall be required before first login.
NFR-9: Authentication tokens shall auto-refresh to prevent session expiry.
NFR-10: API keys and secrets shall never be exposed in client-side code.

5.3 Reliability Requirements
NFR-11: The system shall function offline with local data persistence.
NFR-12: Offline data shall sync automatically when connectivity is restored.
NFR-13: The system shall gracefully handle network errors with user-friendly messages.

5.4 Availability Requirements
NFR-14: The system shall target 99.9% uptime for cloud services.
NFR-15: PWA caching shall ensure core UI is always available.

5.5 Usability Requirements
NFR-16: The system shall support bilingual interface (English / Kiswahili).
NFR-17: The system shall support dark and light themes.
NFR-18: All interactive elements shall be accessible via touch on mobile.
NFR-19: Forms shall provide validation feedback before submission.
NFR-20: Delete operations shall require confirmation dialogs.

5.6 Scalability Requirements
NFR-21: The database schema shall support multi-user concurrent access.
NFR-22: Edge Functions shall scale automatically with traffic.

5.7 Portability Requirements
NFR-23: The application shall run on Chrome, Safari, Firefox, and Edge (latest 2 versions).
NFR-24: The application shall be installable as PWA on Android, iOS, and desktop.`,
  },
  {
    title: '6. Data Model',
    content: `6.1 Database Tables

transactions
• id (UUID, PK)
• user_id (UUID, FK → auth.users)
• amount (NUMERIC)
• type (ENUM: 'income' | 'expense')
• category (TEXT)
• description (TEXT, nullable)
• source (TEXT, nullable)
• transaction_date (DATE)
• created_at, updated_at (TIMESTAMPTZ)

budget_categories
• id (UUID, PK)
• user_id (UUID)
• category (TEXT)
• monthly_limit (NUMERIC)
• icon (TEXT, nullable)
• created_at, updated_at (TIMESTAMPTZ)

savings_goals
• id (UUID, PK)
• user_id (UUID)
• name (TEXT)
• target_amount (NUMERIC)
• saved_amount (NUMERIC, default 0)
• icon (TEXT, nullable)
• deadline (DATE, nullable)
• created_at, updated_at (TIMESTAMPTZ)

debts
• id (UUID, PK)
• user_id (UUID)
• name (TEXT)
• lender (TEXT, nullable)
• total_amount (NUMERIC)
• remaining_amount (NUMERIC)
• interest_rate (NUMERIC, default 0)
• monthly_payment (NUMERIC, nullable)
• due_date (DATE, nullable)
• type (TEXT, default 'personal')
• icon (TEXT, nullable)
• created_at, updated_at (TIMESTAMPTZ)

bill_reminders
• id (UUID, PK)
• user_id (UUID)
• name (TEXT)
• amount (NUMERIC)
• due_day (INTEGER, default 1)
• category (TEXT, default 'Other')
• icon (TEXT, nullable)
• is_paid (BOOLEAN, default false)
• paid_date (DATE, nullable)
• created_at, updated_at (TIMESTAMPTZ)

profiles
• id (UUID, PK)
• user_id (UUID)
• full_name (TEXT, nullable)
• phone (TEXT, nullable)
• currency (TEXT, default 'TZS')
• language (TEXT, default 'en')
• created_at, updated_at (TIMESTAMPTZ)

chat_messages
• id (UUID, PK)
• user_id (UUID)
• role (TEXT)
• content (TEXT)
• created_at (TIMESTAMPTZ)

smart_notifications
• id (UUID, PK)
• user_id (UUID)
• message (TEXT)
• type (TEXT, default 'insight')
• is_read (BOOLEAN, default false)
• created_at (TIMESTAMPTZ)

6.2 RLS Policies
All tables enforce Row-Level Security where users can only SELECT, INSERT, UPDATE, and DELETE their own records (auth.uid() = user_id).`,
  },
  {
    title: '7. System Architecture',
    content: `7.1 Architecture Overview
PesaSmart follows a client-server architecture with a React PWA frontend and Supabase cloud backend.

┌─────────────────────────────────────────────┐
│               Client (PWA)                  │
│  React 18 + TypeScript + Tailwind CSS       │
│  TanStack Query (state) + React Router      │
│  Framer Motion (animations) + Recharts      │
│  IndexedDB (offline storage)                │
│  Service Worker (caching)                   │
├─────────────────────────────────────────────┤
│              HTTPS / WebSocket              │
├─────────────────────────────────────────────┤
│           Supabase Cloud Backend            │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ PostgreSQL   │  │ Edge Functions       │  │
│  │ (RLS)        │  │ • sms-parser         │  │
│  │              │  │ • financial-advisor   │  │
│  │              │  │ • spending-insights   │  │
│  │              │  │ • financial-predict.  │  │
│  └─────────────┘  └──────────────────────┘  │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Auth         │  │ Lovable AI API       │  │
│  │ (email/pw)   │  │ (Gemini / GPT)       │  │
│  └─────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────┘

7.2 Component Hierarchy
App
├── AuthProvider
├── I18nProvider
├── ThemeProvider
├── BrowserRouter
│   ├── /auth → Auth (login/signup)
│   ├── /reset-password → ResetPassword
│   └── ProtectedRoute → AppLayout
│       ├── / → Dashboard
│       ├── /expenses → Expenses
│       ├── /budget → Budget
│       ├── /savings → Savings
│       ├── /debts → Debts
│       ├── /bills → Bills
│       ├── /advisor → Advisor
│       ├── /sms-parser → SmsParser
│       ├── /reports → Reports
│       ├── /tax → Tax
│       ├── /investments → Investments
│       ├── /settings → Settings
│       └── /docs → Documentation`,
  },
  {
    title: '8. Appendices',
    content: `Appendix A: Supported Mobile Money Networks
1. M-Pesa (Vodacom Tanzania)
2. Airtel Money (Airtel Tanzania)
3. Tigo Pesa / Yas / MIX (Tigo Tanzania)
4. HaloPesa (Halotel Tanzania)
5. EzyPesa (Zantel Tanzania)
6. TTCL Pesa (TTCL Tanzania)

Appendix B: Default Budget Categories
• Food (🍽️) — 300,000 TZS
• Transport (🚌) — 150,000 TZS
• Rent (🏠) — 400,000 TZS
• Utilities (💡) — 100,000 TZS
• Entertainment (🎬) — 100,000 TZS
• Education (📖) — 250,000 TZS

Appendix C: Revision History
• Version 1.0 — Initial SRS document
• Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
• Author: PesaSmart Development Team`,
  },
];

type DocTab = 'guide' | 'srs';

const Documentation = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DocTab>('guide');

  const handlePrint = () => {
    window.print();
  };

  const activeSections = activeTab === 'guide' ? userGuideSections : srsSections;
  const title = activeTab === 'guide' ? 'User Guide' : 'Software Requirements Specification (SRS)';

  return (
    <>
      {/* Screen-only */}
      <div className="print:hidden pb-24 pt-2 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold font-display">Documentation</h1>
          </div>
          <Button onClick={handlePrint} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
            <Download size={16} /> Download PDF
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'guide' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            User Guide
          </button>
          <button
            onClick={() => setActiveTab('srs')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'srs' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            SRS Document
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {activeTab === 'guide'
            ? 'Complete user guide for PesaSmart. Click "Download PDF" to save.'
            : 'Software Requirements Specification (IEEE 830 format). Click "Download PDF" to save.'}
        </p>

        {activeSections.map((section, i) => (
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
        <h1 style={{ textAlign: 'center', marginBottom: 4 }}>PesaSmart — {title}</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 24 }}>Personal Finance Manager for Tanzania</p>
        {activeSections.map((section, i) => (
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
