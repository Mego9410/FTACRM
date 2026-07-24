// In-app help content. Add a topic here (or a section to one) whenever a module
// ships or changes — the /help centre renders straight from this list, so it
// stays the single place to keep guidance current.

export type HelpSection = { heading: string; body: string[]; bullets?: string[] };
export type HelpTopic = {
  slug: string;
  title: string;
  summary: string;
  icon: string; // lucide icon name rendered in the index
  sections: HelpSection[];
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "Signing in, finding your way around, and the daily basics.",
    icon: "Compass",
    sections: [
      {
        heading: "Signing in for the first time",
        body: [
          "Your administrator creates your account and you receive a welcome email with a sign-in link and a temporary password. On first sign-in you'll be asked to set your own password.",
          "If you lose your temporary password, an admin can reset it for you from Control Centre → Users, or use \"Forgotten password?\" on the sign-in screen.",
        ],
      },
      {
        heading: "Finding your way around",
        body: ["The left sidebar is your main menu; the top bar has global search, quick-add (+), notifications and your profile."],
        bullets: [
          "Search anything — contacts, practices and deals — from the top bar (⌘K / Ctrl K).",
          "The + menu quickly creates a contact, practice, task, reminder or event.",
          "The bell shows recent notifications; \"View all notifications\" opens the full history.",
        ],
      },
      {
        heading: "Your settings",
        body: ["Under your avatar → My settings you can set your name, job title, phone, calendar colour, email signature, notification preferences, change your email or password, and connect Microsoft 365."],
      },
    ],
  },
  {
    slug: "contacts",
    title: "Contacts",
    summary: "People and organisations — buyers, sellers, solicitors and more.",
    icon: "UsersRound",
    sections: [
      {
        heading: "What a contact holds",
        body: ["A contact is a person or organisation. One contact can hold several roles (e.g. buyer and seller). The header shows their roles, status and buyer temperature."],
      },
      {
        heading: "Working a contact",
        body: ["Use the tabs to see everything on one record:"],
        bullets: [
          "Details — core fields, GDPR consent and AML/ID verification.",
          "Buyer profile — search criteria that drive matching (buyers only).",
          "Tasks, Journal (notes/calls/emails), Documents, Checklists, Related and Audit.",
          "Change a contact's status inline from the header without opening the edit form.",
        ],
      },
    ],
  },
  {
    slug: "practices",
    title: "Practices",
    summary: "Instructions from first valuation through to completion.",
    icon: "Building2",
    sections: [
      {
        heading: "The practices list",
        body: ["Switch between grid and list views. Practices that are no longer on the market (withdrawn or completed) are hidden by default — untick \"Hide off-market\" to show them. They're never deleted; they stay on the database."],
      },
      {
        heading: "On a practice",
        body: ["Manage the listing, its people, valuations, viewings, offers and matched buyers. Change status and launch to market from the header. Generate seller documents (like the Letter of Authority) from the Documents tab."],
      },
    ],
  },
  {
    slug: "deals",
    title: "Sales progression (deals)",
    summary: "Tracking an agreed sale to completion.",
    icon: "Handshake",
    sections: [
      {
        heading: "The stage tracker",
        body: [
          "Each deal follows the firm's standard stage template (managed in Control Centre → Deal stages). Mark stages done as they're achieved; the terminal stage completes the deal.",
          "Because every transaction is a little different, you can add deal-specific stages on the Progression tab — they sit alongside the template steps and are tracked just for that deal.",
        ],
      },
      {
        heading: "Parties",
        body: ["The People tab lets you set the buyer and seller on the deal. Solicitors and other advisers are managed on the practice's People tab so there's a single source for everyone involved."],
      },
    ],
  },
  {
    slug: "documents",
    title: "Documents & e-signing",
    summary: "Generate, send and sign documents in the app.",
    icon: "FileSignature",
    sections: [
      {
        heading: "Generating a document",
        body: ["From a record's Documents tab, choose a template (e.g. Letter of Authority, Holding Deposit, Heads of Agreement). Fields pre-fill from the record; confirm the details, and you can edit the wording before sending."],
      },
      {
        heading: "Signing",
        body: [
          "Each signer gets their own secure link. They open it, see the document and a live status of all parties, type their name and sign.",
          "For two-party documents like the Heads of Agreement, both parties sign on their own links and each can see when the other has signed. Once everyone has signed, a Download button appears for the completed copy.",
        ],
      },
      {
        heading: "Adding templates",
        body: ["Admins manage the template library in Control Centre → Documents, including the merge fields each template uses."],
      },
    ],
  },
  {
    slug: "tasks-calendar",
    title: "Tasks, reminders & calendar",
    summary: "Staying on top of what needs doing.",
    icon: "ListTodo",
    sections: [
      {
        heading: "Tasks & reminders",
        body: ["Create tasks from the + menu, the My tasks page, or any record's Tasks tab. Set a due date, assignee, priority and a reminder. \"New reminder\" in the + menu is a quick way to set one for yourself."],
      },
      {
        heading: "Calendar",
        body: ["The calendar shows events and holidays across the team. Book your own leave under your avatar → My holiday; managers approve requests in Control Centre → Holiday."],
      },
    ],
  },
  {
    slug: "campaigns",
    title: "Campaigns & launches",
    summary: "Marketing a practice to matched buyers.",
    icon: "Rocket",
    sections: [
      {
        heading: "Launches",
        body: ["When a practice goes to market, a launch identifies and ranks the best-matched buyers and prepares outreach. Email sending activates once Resend is connected; until then everything can be drafted and queued."],
      },
    ],
  },
  {
    slug: "reporting",
    title: "Reporting",
    summary: "Numbers, trends and smart lists.",
    icon: "BarChart3",
    sections: [
      {
        heading: "Reports",
        body: ["The Reporting area covers activity, email volume, monthly figures and referrals. Most tables can be exported. Reporting is available to all staff."],
      },
    ],
  },
  {
    slug: "control-centre",
    title: "Control Centre (admins)",
    summary: "Firm-wide configuration and team management.",
    icon: "Settings",
    sections: [
      {
        heading: "What admins can manage",
        body: ["Control Centre gathers everything firm-wide in one place:"],
        bullets: [
          "Firm settings — company details, default fees and email sender identity.",
          "Deal stages — the standard progression template.",
          "Users — create accounts (invite emails), reset passwords, roles and profile fields.",
          "Lookups, Checklists, Intro email blocks, Documents, Permissions, Holiday and Audit.",
        ],
      },
    ],
  },
];

export function getHelpTopic(slug: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.slug === slug);
}
