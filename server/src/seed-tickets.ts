import "dotenv/config";
import prisma from "./lib/prisma";

type Status = "open" | "closed" | "pending";
type Direction = "inbound" | "outbound";

interface SeedMessage {
  body: string;
  sender: string;
  direction: Direction;
  gmailMessageId: string;
}

interface SeedTicket {
  id: string;
  subject: string;
  status: Status;
  clientEmail: string;
  gmailThreadId: string;
  messages: SeedMessage[];
}

const tickets: SeedTicket[] = [
  // --- Authentication & Account ---
  {
    id: "ticket_001", subject: "Cannot log into my account", status: "open",
    clientEmail: "alice.johnson@example.com", gmailThreadId: "thread_demo_001",
    messages: [
      { body: "Hi, I've been trying to log in for the past hour but keep getting 'Invalid credentials'. I'm sure my password is correct. Can you help?", sender: "alice.johnson@example.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d001a" },
    ],
  },
  {
    id: "ticket_002", subject: "Two-factor authentication code not arriving", status: "open",
    clientEmail: "marcus.riley@outlook.com", gmailThreadId: "thread_demo_002",
    messages: [
      { body: "I enabled 2FA last week and now the SMS codes aren't arriving. I've tried multiple times. My phone number is correct in the settings.", sender: "marcus.riley@outlook.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d002a" },
      { body: "Hi Marcus, sorry about that! We're seeing some delays with SMS providers. Could you try the authenticator app option instead? Go to Security → 2FA → Switch to App.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d002b" },
    ],
  },
  {
    id: "ticket_003", subject: "Forgot password reset link expired", status: "closed",
    clientEmail: "priya.sharma@gmail.com", gmailThreadId: "thread_demo_003",
    messages: [
      { body: "The password reset link I got expired before I could use it. Can you send a new one?", sender: "priya.sharma@gmail.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d003a" },
      { body: "Of course! A new reset link is valid for 30 minutes. We've just sent a fresh one to priya.sharma@gmail.com.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d003b" },
      { body: "That worked, thank you!", sender: "priya.sharma@gmail.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d003c" },
    ],
  },
  {
    id: "ticket_004", subject: "Account locked after too many login attempts", status: "pending",
    clientEmail: "james.okafor@company.co.uk", gmailThreadId: "thread_demo_004",
    messages: [
      { body: "My account got locked. I think I mistyped my password too many times. How do I unlock it?", sender: "james.okafor@company.co.uk", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d004a" },
      { body: "Hi James, I've unlocked your account. For security we'll need you to reset your password before logging in. Link sent!", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d004b" },
    ],
  },
  {
    id: "ticket_005", subject: "Cannot change my email address", status: "open",
    clientEmail: "sophie.chen@design.studio", gmailThreadId: "thread_demo_005",
    messages: [
      { body: "I'm trying to update my email in account settings but it says 'Email already in use' even though I've never registered with that email before. Please help.", sender: "sophie.chen@design.studio", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d005a" },
    ],
  },

  // --- Billing & Payments ---
  {
    id: "ticket_006", subject: "Request for refund on order #8821", status: "pending",
    clientEmail: "bob.smith@acme.com", gmailThreadId: "thread_demo_006",
    messages: [
      { body: "I'd like a refund for order #8821. The product arrived damaged and doesn't match the description. I have photos if needed.", sender: "bob.smith@acme.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d006a" },
      { body: "Hi Bob, sorry to hear that! We've started processing your refund. Could you send us the photos? You'll receive the refund within 3–5 business days.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d006b" },
    ],
  },
  {
    id: "ticket_007", subject: "Billing charge I don't recognize — $49.99", status: "open",
    clientEmail: "david.lee@gmail.com", gmailThreadId: "thread_demo_007",
    messages: [
      { body: "I noticed a $49.99 charge on May 10th. I don't remember authorizing this. Can you explain and refund if it was a mistake?", sender: "david.lee@gmail.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d007a" },
    ],
  },
  {
    id: "ticket_008", subject: "Double charged for subscription renewal", status: "open",
    clientEmail: "natalie.west@freelance.net", gmailThreadId: "thread_demo_008",
    messages: [
      { body: "I was charged twice for my monthly subscription renewal — two $29 charges on the same day. Please refund the duplicate.", sender: "natalie.west@freelance.net", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d008a" },
    ],
  },
  {
    id: "ticket_009", subject: "Invoice shows wrong company name", status: "closed",
    clientEmail: "finance@globaltrade.com", gmailThreadId: "thread_demo_009",
    messages: [
      { body: "Our latest invoice shows 'Global Trading Ltd' but our legal entity name is 'Global Trade International LLC'. Can you reissue it?", sender: "finance@globaltrade.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d009a" },
      { body: "Absolutely! We've updated your billing profile and reissued invoice #INV-00982 with the correct name. You'll find it attached.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d009b" },
      { body: "Perfect, thank you for the quick turnaround!", sender: "finance@globaltrade.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d009c" },
    ],
  },
  {
    id: "ticket_010", subject: "Promo code not applying at checkout", status: "open",
    clientEmail: "liam.nguyen@shopfast.io", gmailThreadId: "thread_demo_010",
    messages: [
      { body: "I have the promo code SAVE20 from your newsletter but it's saying 'Code not valid' at checkout. The email says it's valid until June 30.", sender: "liam.nguyen@shopfast.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d010a" },
    ],
  },

  // --- Integrations & API ---
  {
    id: "ticket_011", subject: "Slack integration stopped sending notifications", status: "open",
    clientEmail: "emma.davis@techcorp.com", gmailThreadId: "thread_demo_011",
    messages: [
      { body: "We set up the Slack integration last week but notifications stopped coming through yesterday. Our workspace is still connected in settings.", sender: "emma.davis@techcorp.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d011a" },
    ],
  },
  {
    id: "ticket_012", subject: "API rate limit hit on free tier — need increase", status: "pending",
    clientEmail: "dev@buildfast.app", gmailThreadId: "thread_demo_012",
    messages: [
      { body: "We're hitting the 100 req/min rate limit during business hours. We'd like to upgrade or get a temporary limit increase while we evaluate the Pro plan.", sender: "dev@buildfast.app", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d012a" },
      { body: "Thanks for reaching out! We've temporarily bumped your limit to 500 req/min for 7 days while you evaluate. Let me know if you have questions about the Pro plan.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d012b" },
    ],
  },
  {
    id: "ticket_013", subject: "Webhook events not arriving after endpoint change", status: "open",
    clientEmail: "platform@rocketship.dev", gmailThreadId: "thread_demo_013",
    messages: [
      { body: "We updated our webhook URL last night but events stopped arriving. I verified the new URL returns 200 for our test pings. Is there a delay in propagation?", sender: "platform@rocketship.dev", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d013a" },
    ],
  },
  {
    id: "ticket_014", subject: "OAuth flow returning 403 after token refresh", status: "open",
    clientEmail: "backend@datastream.co", gmailThreadId: "thread_demo_014",
    messages: [
      { body: "Since yesterday our OAuth token refresh is returning 403. The access token expires correctly but the refresh call fails. No changes on our end.", sender: "backend@datastream.co", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d014a" },
    ],
  },
  {
    id: "ticket_015", subject: "Zapier integration not finding new records", status: "closed",
    clientEmail: "ops@marketingco.agency", gmailThreadId: "thread_demo_015",
    messages: [
      { body: "Our Zapier zap that watches for new contacts stopped triggering. It was working fine for 3 months.", sender: "ops@marketingco.agency", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d015a" },
      { body: "Hi! We released an API update that changed the polling endpoint. Please re-authenticate your Zapier connection — that should fix it.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d015b" },
      { body: "Re-authenticated and it's working again, thanks!", sender: "ops@marketingco.agency", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d015c" },
    ],
  },

  // --- Data & Exports ---
  {
    id: "ticket_016", subject: "How do I export my data in CSV?", status: "closed",
    clientEmail: "carol.white@startup.io", gmailThreadId: "thread_demo_016",
    messages: [
      { body: "Is there a way to export all my data from the platform in CSV format for a report?", sender: "carol.white@startup.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d016a" },
      { body: "Hi Carol! Go to Settings → Data → Export and select CSV. The download will be ready in a few minutes.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d016b" },
    ],
  },
  {
    id: "ticket_017", subject: "Data export stuck at 0% for 2 hours", status: "open",
    clientEmail: "analytics@enterprise.org", gmailThreadId: "thread_demo_017",
    messages: [
      { body: "I triggered a full data export at 9 AM and it's still showing 0% at 11 AM. The dataset is large (~2 million rows) but this seems wrong.", sender: "analytics@enterprise.org", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d017a" },
    ],
  },
  {
    id: "ticket_018", subject: "CSV export contains incorrect date formats", status: "pending",
    clientEmail: "reporting@financegroup.eu", gmailThreadId: "thread_demo_018",
    messages: [
      { body: "The CSV export shows dates as MM/DD/YYYY but our system expects DD/MM/YYYY. Is there a setting to change this?", sender: "reporting@financegroup.eu", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d018a" },
      { body: "Good catch! We've added a locale setting to the export dialog. Go to Export → Advanced → Date Format and select your preference.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d018b" },
    ],
  },
  {
    id: "ticket_019", subject: "Missing data in export — last 3 days not included", status: "open",
    clientEmail: "data.team@logistech.com", gmailThreadId: "thread_demo_019",
    messages: [
      { body: "The export I ran this morning doesn't include any records from the past 3 days. Our date range was set to 'All time'. Is there a known issue?", sender: "data.team@logistech.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d019a" },
    ],
  },
  {
    id: "ticket_020", subject: "Can I schedule automated exports?", status: "closed",
    clientEmail: "operations@weeklyco.io", gmailThreadId: "thread_demo_020",
    messages: [
      { body: "We need to send a weekly CSV report to our finance team every Monday. Is there a way to schedule exports automatically?", sender: "operations@weeklyco.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d020a" },
      { body: "Yes! Go to Reports → Scheduled Exports → New Schedule. You can set daily or weekly cadence and email recipients.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d020b" },
      { body: "Great, got it set up. Thanks!", sender: "operations@weeklyco.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d020c" },
    ],
  },

  // --- Performance & Bugs ---
  {
    id: "ticket_021", subject: "Dashboard loading very slowly — takes 30+ seconds", status: "open",
    clientEmail: "cto@slowsite.io", gmailThreadId: "thread_demo_021",
    messages: [
      { body: "Since the update yesterday our dashboard takes 30+ seconds to load. It's impacting our team's productivity. Is there an ongoing issue?", sender: "cto@slowsite.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d021a" },
    ],
  },
  {
    id: "ticket_022", subject: "Page crashes on Safari — 'Script error'", status: "open",
    clientEmail: "design@applelover.com", gmailThreadId: "thread_demo_022",
    messages: [
      { body: "The settings page crashes immediately on Safari 17 with a 'Script error'. Works fine on Chrome. Can you look into this?", sender: "design@applelover.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d022a" },
    ],
  },
  {
    id: "ticket_023", subject: "Search returning no results for existing records", status: "pending",
    clientEmail: "admin@searchtest.net", gmailThreadId: "thread_demo_023",
    messages: [
      { body: "The global search bar returns 'No results' even when I search for an exact customer name that I can see in the list. Started happening this morning.", sender: "admin@searchtest.net", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d023a" },
      { body: "We identified a search index issue that was deployed this morning. A fix is being rolled out now — should be resolved within the hour.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d023b" },
    ],
  },
  {
    id: "ticket_024", subject: "Notifications badge showing wrong count", status: "closed",
    clientEmail: "ux.test@appreview.com", gmailThreadId: "thread_demo_024",
    messages: [
      { body: "The notification badge shows 14 unread but when I open it there are only 2. Clearing and refreshing doesn't fix it.", sender: "ux.test@appreview.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d024a" },
      { body: "This was a caching bug. We've pushed a fix. Please hard-refresh (Ctrl+Shift+R) and let us know if the count is correct now.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d024b" },
      { body: "Fixed! Showing correctly now.", sender: "ux.test@appreview.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d024c" },
    ],
  },
  {
    id: "ticket_025", subject: "File upload failing — size limit error", status: "open",
    clientEmail: "media@contentstudio.co", gmailThreadId: "thread_demo_025",
    messages: [
      { body: "I'm trying to upload a 12 MB PDF but getting 'File exceeds maximum size'. Your docs say the limit is 25 MB. Am I doing something wrong?", sender: "media@contentstudio.co", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d025a" },
    ],
  },

  // --- Feature Requests ---
  {
    id: "ticket_026", subject: "Feature request: dark mode", status: "closed",
    clientEmail: "nightowl@devstack.io", gmailThreadId: "thread_demo_026",
    messages: [
      { body: "Any plans to add a dark mode? Working late at night and the bright UI is rough on the eyes.", sender: "nightowl@devstack.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d026a" },
      { body: "Dark mode is on our roadmap for Q3! We'll notify you when it launches. Thanks for the feedback.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d026b" },
    ],
  },
  {
    id: "ticket_027", subject: "Can I add custom fields to contact records?", status: "pending",
    clientEmail: "crm.admin@salesteam.com", gmailThreadId: "thread_demo_027",
    messages: [
      { body: "We need to track a few custom attributes per contact (e.g. Account Tier, Region). Is there a way to add custom fields?", sender: "crm.admin@salesteam.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d027a" },
      { body: "Custom fields are available on the Business plan. You can add them under Settings → Contacts → Custom Fields. Would you like more info on upgrading?", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d027b" },
    ],
  },
  {
    id: "ticket_028", subject: "Request to add bulk email feature", status: "open",
    clientEmail: "marketing@growthlab.co", gmailThreadId: "thread_demo_028",
    messages: [
      { body: "We'd love to send bulk emails to filtered segments of contacts. Right now we have to export and use a separate tool. Is this on the roadmap?", sender: "marketing@growthlab.co", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d028a" },
    ],
  },
  {
    id: "ticket_029", subject: "Keyboard shortcut for new record?", status: "closed",
    clientEmail: "power.user@speedcoder.dev", gmailThreadId: "thread_demo_029",
    messages: [
      { body: "Is there a keyboard shortcut to create a new ticket without clicking the button?", sender: "power.user@speedcoder.dev", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d029a" },
      { body: "Yes! Press 'N' anywhere on the tickets page to open the new ticket form. Full shortcut list: Shift+? to see all shortcuts.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d029b" },
      { body: "Amazing, didn't know that. Thanks!", sender: "power.user@speedcoder.dev", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d029c" },
    ],
  },
  {
    id: "ticket_030", subject: "Support for multiple inboxes per account", status: "open",
    clientEmail: "platform@multibrand.co", gmailThreadId: "thread_demo_030",
    messages: [
      { body: "We run 3 support inboxes for different brands. Can we connect all three to a single account and route tickets by brand?", sender: "platform@multibrand.co", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d030a" },
    ],
  },

  // --- Onboarding & How-to ---
  {
    id: "ticket_031", subject: "How do I invite team members?", status: "closed",
    clientEmail: "hr@newstartup.xyz", gmailThreadId: "thread_demo_031",
    messages: [
      { body: "I just signed up and want to add my 3 colleagues. Where do I invite them?", sender: "hr@newstartup.xyz", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d031a" },
      { body: "Go to Settings → Team → Invite Members. Enter their emails and assign roles. They'll get an invite link valid for 48 hours.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d031b" },
    ],
  },
  {
    id: "ticket_032", subject: "How to set up automations / workflows?", status: "open",
    clientEmail: "ops.lead@workflowco.com", gmailThreadId: "thread_demo_032",
    messages: [
      { body: "I want to automatically assign incoming tickets to specific agents based on keywords. Is there a workflow builder?", sender: "ops.lead@workflowco.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d032a" },
    ],
  },
  {
    id: "ticket_033", subject: "Where is the knowledge base section?", status: "closed",
    clientEmail: "newbie@firstemail.com", gmailThreadId: "thread_demo_033",
    messages: [
      { body: "I saw in the demo that there's a knowledge base feature. I can't find it in my account. Is it hidden somewhere?", sender: "newbie@firstemail.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d033a" },
      { body: "The knowledge base is in the left sidebar under 'Knowledge'. If you don't see it, make sure your plan includes this feature — it's available from Starter and up.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d033b" },
    ],
  },
  {
    id: "ticket_034", subject: "How to set up SLA rules?", status: "pending",
    clientEmail: "support.manager@enterprise.com", gmailThreadId: "thread_demo_034",
    messages: [
      { body: "We need to configure SLA policies — e.g. respond within 4h for priority tickets. Where do I find that setting?", sender: "support.manager@enterprise.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d034a" },
      { body: "SLA policies are under Settings → Support → SLA Policies. You can define conditions by priority, ticket type, or customer tier.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d034b" },
    ],
  },
  {
    id: "ticket_035", subject: "Can I connect my own domain for email replies?", status: "open",
    clientEmail: "admin@customdomain.biz", gmailThreadId: "thread_demo_035",
    messages: [
      { body: "I want replies to come from support@mydomain.com instead of your generic address. Is custom email domain supported?", sender: "admin@customdomain.biz", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d035a" },
    ],
  },

  // --- Subscription & Plan ---
  {
    id: "ticket_036", subject: "Want to downgrade from Pro to Starter", status: "open",
    clientEmail: "budget@smallbiz.net", gmailThreadId: "thread_demo_036",
    messages: [
      { body: "We've been on Pro for 6 months but don't use most features. How do I downgrade to Starter? Will I lose any data?", sender: "budget@smallbiz.net", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d036a" },
    ],
  },
  {
    id: "ticket_037", subject: "Can I get a non-profit discount?", status: "pending",
    clientEmail: "director@charityhq.org", gmailThreadId: "thread_demo_037",
    messages: [
      { body: "We're a registered 501(c)(3) nonprofit. Do you offer discounted pricing? We'd love to use your platform but can't afford the current rate.", sender: "director@charityhq.org", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d037a" },
      { body: "We do offer a 30% nonprofit discount! Please send your 501(c)(3) determination letter to billing@helpdesk.com and we'll apply it to your account.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d037b" },
    ],
  },
  {
    id: "ticket_038", subject: "Subscription auto-renewed but I cancelled", status: "open",
    clientEmail: "angry.user@cancelled.com", gmailThreadId: "thread_demo_038",
    messages: [
      { body: "I cancelled my subscription on May 1st but was still charged on May 15th for renewal. I have the cancellation confirmation email. Please refund.", sender: "angry.user@cancelled.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d038a" },
    ],
  },
  {
    id: "ticket_039", subject: "Upgrade to Enterprise — need custom contract", status: "pending",
    clientEmail: "procurement@bigcorp.com", gmailThreadId: "thread_demo_039",
    messages: [
      { body: "We're interested in the Enterprise plan but require a custom MSA and DPA. Can you connect us with your sales/legal team?", sender: "procurement@bigcorp.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d039a" },
      { body: "Of course! I've looped in our Enterprise team. Expect an email from enterprise@helpdesk.com within 1 business day to arrange a call.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d039b" },
    ],
  },
  {
    id: "ticket_040", subject: "How many seats does Team plan include?", status: "closed",
    clientEmail: "planner@growing.team", gmailThreadId: "thread_demo_040",
    messages: [
      { body: "I'm evaluating plans. Does the Team plan limit the number of agent seats?", sender: "planner@growing.team", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d040a" },
      { body: "The Team plan includes 10 agent seats. Beyond that, additional seats are $15/mo each. The Enterprise plan is unlimited.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d040b" },
    ],
  },

  // --- Security & Privacy ---
  {
    id: "ticket_041", subject: "Suspicious login from unknown location", status: "open",
    clientEmail: "security.alert@watchful.me", gmailThreadId: "thread_demo_041",
    messages: [
      { body: "I received a notification of a login from an IP in Ukraine but I'm based in New York. I didn't log in. Please help secure my account.", sender: "security.alert@watchful.me", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d041a" },
    ],
  },
  {
    id: "ticket_042", subject: "GDPR data deletion request", status: "pending",
    clientEmail: "legal@eufirm.de", gmailThreadId: "thread_demo_042",
    messages: [
      { body: "Per GDPR Article 17, we request permanent deletion of all personal data associated with our account. Please confirm the process and timeline.", sender: "legal@eufirm.de", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d042a" },
      { body: "We've submitted your deletion request to our Data team. You'll receive a confirmation within 5 business days. Deletion is completed within 30 days per GDPR.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d042b" },
    ],
  },
  {
    id: "ticket_043", subject: "Is my data stored in the EU?", status: "closed",
    clientEmail: "compliance@eubank.nl", gmailThreadId: "thread_demo_043",
    messages: [
      { body: "We need to confirm data residency for compliance. Is our data stored exclusively within the European Union?", sender: "compliance@eubank.nl", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d043a" },
      { body: "Yes — EU customers are hosted in our Frankfurt data center (AWS eu-central-1). No data leaves the EU. DPA available on request.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d043b" },
      { body: "Perfect, that's exactly what we needed. Thank you.", sender: "compliance@eubank.nl", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d043c" },
    ],
  },
  {
    id: "ticket_044", subject: "SSO / SAML configuration help", status: "open",
    clientEmail: "it.admin@largeenterprise.com", gmailThreadId: "thread_demo_044",
    messages: [
      { body: "We're setting up SAML SSO with Okta. I've filled in the SP metadata but the IdP-initiated login returns a 403. Any config checklist?", sender: "it.admin@largeenterprise.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d044a" },
    ],
  },
  {
    id: "ticket_045", subject: "Need SOC 2 report for vendor review", status: "pending",
    clientEmail: "vendor.mgmt@fortune500.com", gmailThreadId: "thread_demo_045",
    messages: [
      { body: "Our vendor security review requires a SOC 2 Type II report. Can you provide it under NDA?", sender: "vendor.mgmt@fortune500.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d045a" },
      { body: "Of course! Our current SOC 2 Type II report is available under NDA. Please sign the NDA at [link] and we'll send the report within 1 business day.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d045b" },
    ],
  },

  // --- Mobile App ---
  {
    id: "ticket_046", subject: "iOS app crashes on startup after update", status: "open",
    clientEmail: "iphone.user@mobile.io", gmailThreadId: "thread_demo_046",
    messages: [
      { body: "Since updating to version 3.2.1 the iOS app crashes immediately on launch. Force closing and reopening doesn't help. iPhone 15 Pro, iOS 17.4.", sender: "iphone.user@mobile.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d046a" },
    ],
  },
  {
    id: "ticket_047", subject: "Push notifications not working on Android", status: "pending",
    clientEmail: "android.fan@pixel.me", gmailThreadId: "thread_demo_047",
    messages: [
      { body: "I stopped receiving push notifications on my Pixel 8 about 3 days ago. Notifications are enabled in both the app and phone settings.", sender: "android.fan@pixel.me", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d047a" },
      { body: "Hi! Try removing the app and reinstalling. There was a token expiration bug in v3.1 that a reinstall will fix. Let us know if that helps.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d047b" },
    ],
  },
  {
    id: "ticket_048", subject: "Can't attach files in mobile app", status: "closed",
    clientEmail: "tablet.user@ipadlife.com", gmailThreadId: "thread_demo_048",
    messages: [
      { body: "The file attachment button in the mobile app doesn't do anything when I tap it. Works fine on desktop.", sender: "tablet.user@ipadlife.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d048a" },
      { body: "This was a bug in v3.1. Please update to v3.2 from the App Store — file attachments are working again there.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d048b" },
    ],
  },
  {
    id: "ticket_049", subject: "Offline mode not syncing when back online", status: "open",
    clientEmail: "field.agent@remote.work", gmailThreadId: "thread_demo_049",
    messages: [
      { body: "We use the app in areas with poor connectivity. When we come back online, offline changes from the last session don't sync. We lose data.", sender: "field.agent@remote.work", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d049a" },
    ],
  },
  {
    id: "ticket_050", subject: "Is there a tablet-optimized layout?", status: "closed",
    clientEmail: "ipad.power@tabletwork.com", gmailThreadId: "thread_demo_050",
    messages: [
      { body: "The iPad app looks like a stretched phone app. Is there a proper tablet layout planned?", sender: "ipad.power@tabletwork.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d050a" },
      { body: "A tablet-optimized layout is in our roadmap for the next major release (v4.0). Thank you for the feedback!", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d050b" },
    ],
  },

  // --- AI / Automation ---
  {
    id: "ticket_051", subject: "AI suggestions are inaccurate — wrong category", status: "open",
    clientEmail: "qa@aitest.io", gmailThreadId: "thread_demo_051",
    messages: [
      { body: "The AI is consistently mis-categorizing billing tickets as 'Technical Issues'. This happens about 40% of the time. Can we retrain or adjust the model?", sender: "qa@aitest.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d051a" },
    ],
  },
  {
    id: "ticket_052", subject: "Auto-reply sent to wrong customer", status: "open",
    clientEmail: "escalate@upset.customer", gmailThreadId: "thread_demo_052",
    messages: [
      { body: "Your automated reply was sent to a completely unrelated customer — it contained another person's order details. This is a serious privacy issue.", sender: "escalate@upset.customer", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d052a" },
    ],
  },
  {
    id: "ticket_053", subject: "How to disable automatic responses for VIP accounts?", status: "closed",
    clientEmail: "cs.manager@premium.service", gmailThreadId: "thread_demo_053",
    messages: [
      { body: "We want AI auto-replies disabled for our VIP tier customers so agents always handle them manually. Is this configurable?", sender: "cs.manager@premium.service", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d053a" },
      { body: "Yes! Under Settings → Automations → Auto-Reply, you can exclude contacts by tag or tier. Tag your VIP accounts and exclude that tag from the rule.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d053b" },
    ],
  },
  {
    id: "ticket_054", subject: "AI response confidence threshold — how to tune?", status: "pending",
    clientEmail: "ml.engineer@aiops.com", gmailThreadId: "thread_demo_054",
    messages: [
      { body: "We'd like to lower the confidence threshold so more tickets go to human review. Where is that setting?", sender: "ml.engineer@aiops.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d054a" },
      { body: "Go to Settings → AI → Response Confidence. The default is 85%. You can lower it — we recommend 70% as a starting point.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d054b" },
    ],
  },
  {
    id: "ticket_055", subject: "Knowledge base articles not being used in AI replies", status: "open",
    clientEmail: "kb.admin@helpcentre.com", gmailThreadId: "thread_demo_055",
    messages: [
      { body: "We added 50 KB articles last week but the AI still gives generic answers instead of referencing them. Is there an indexing delay?", sender: "kb.admin@helpcentre.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d055a" },
    ],
  },

  // --- Miscellaneous / Edge Cases ---
  {
    id: "ticket_056", subject: "Can I merge duplicate tickets?", status: "closed",
    clientEmail: "tidy.admin@orgfreak.com", gmailThreadId: "thread_demo_056",
    messages: [
      { body: "I have the same issue reported twice by the same customer. Can I merge these tickets?", sender: "tidy.admin@orgfreak.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d056a" },
      { body: "Yes! Open the primary ticket, click the '...' menu → Merge Ticket, then search for the duplicate.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d056b" },
    ],
  },
  {
    id: "ticket_057", subject: "Wrong language in auto-reply", status: "open",
    clientEmail: "cliente@empresa.es", gmailThreadId: "thread_demo_057",
    messages: [
      { body: "Los correos automáticos nos llegan en inglés pero nosotros somos una empresa española. ¿Cómo cambiamos el idioma a español?", sender: "cliente@empresa.es", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d057a" },
    ],
  },
  {
    id: "ticket_058", subject: "Ticket assignment notification emails going to spam", status: "pending",
    clientEmail: "spam.problem@inboxissues.com", gmailThreadId: "thread_demo_058",
    messages: [
      { body: "Our agents are missing ticket assignments because the notification emails land in spam. Can you provide SPF/DKIM records to whitelist?", sender: "spam.problem@inboxissues.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d058a" },
      { body: "Our sending domains are: helpdesk.com and mail.helpdesk.com. SPF and DKIM records are published. Your IT team can whitelist mail.helpdesk.com.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d058b" },
    ],
  },
  {
    id: "ticket_059", subject: "Ticket closed automatically — didn't want that", status: "open",
    clientEmail: "not.done@stillopened.com", gmailThreadId: "thread_demo_059",
    messages: [
      { body: "My ticket was automatically closed after 7 days but the issue is still unresolved. Can you reopen it and explain why it was auto-closed?", sender: "not.done@stillopened.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d059a" },
    ],
  },
  {
    id: "ticket_060", subject: "Need to transfer tickets to new agent", status: "closed",
    clientEmail: "team.lead@handover.com", gmailThreadId: "thread_demo_060",
    messages: [
      { body: "One of our agents is leaving. How do I bulk reassign their 40 open tickets to another agent?", sender: "team.lead@handover.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d060a" },
      { body: "In the Tickets view, filter by agent → select all → click 'Reassign' from the bulk actions menu. You can reassign all at once.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d060b" },
    ],
  },

  // --- Additional open/mixed status tickets for volume ---
  {
    id: "ticket_061", subject: "Contact form submissions not creating tickets", status: "open",
    clientEmail: "webmaster@lostleads.com", gmailThreadId: "thread_demo_061",
    messages: [{ body: "Our website contact form stopped creating tickets 2 days ago. The form submits successfully but nothing appears in the helpdesk.", sender: "webmaster@lostleads.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d061a" }],
  },
  {
    id: "ticket_062", subject: "Agent permissions — need read-only role", status: "pending",
    clientEmail: "hr.manager@bigteam.org", gmailThreadId: "thread_demo_062",
    messages: [
      { body: "Can we create a read-only role for managers who need to view tickets but shouldn't be able to reply or edit?", sender: "hr.manager@bigteam.org", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d062a" },
      { body: "A read-only viewer role is on our permission roadmap. For now, you can create an agent and restrict individual permissions under their profile.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d062b" },
    ],
  },
  {
    id: "ticket_063", subject: "Time tracking per ticket — is it supported?", status: "closed",
    clientEmail: "billable.hours@consulting.firm", gmailThreadId: "thread_demo_063",
    messages: [
      { body: "Do you support time tracking per ticket so we can bill clients by time spent?", sender: "billable.hours@consulting.firm", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d063a" },
      { body: "Yes! Enable time tracking under Settings → Tickets → Time Tracking. Agents can log time manually or use the built-in timer on each ticket.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d063b" },
    ],
  },
  {
    id: "ticket_064", subject: "Can agents see each other's private notes?", status: "closed",
    clientEmail: "privacy.concerned@notes.io", gmailThreadId: "thread_demo_064",
    messages: [
      { body: "If an agent adds a private note to a ticket, can other agents on the team see it?", sender: "privacy.concerned@notes.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d064a" },
      { body: "Yes, private notes are visible to all agents and admins but never to customers. They appear with a lock icon.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d064b" },
    ],
  },
  {
    id: "ticket_065", subject: "Attachments in ticket replies not downloading", status: "open",
    clientEmail: "docs@fileissue.co", gmailThreadId: "thread_demo_065",
    messages: [{ body: "When I click to download an attachment from a ticket reply, nothing happens. It works for some tickets but not others.", sender: "docs@fileissue.co", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d065a" }],
  },
  {
    id: "ticket_066", subject: "Canned responses not saving", status: "open",
    clientEmail: "template.user@efficiency.com", gmailThreadId: "thread_demo_066",
    messages: [{ body: "I try to save a new canned response but it disappears after I navigate away. The save button shows a spinner but then nothing.", sender: "template.user@efficiency.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d066a" }],
  },
  {
    id: "ticket_067", subject: "Wrong timezone in ticket timestamps", status: "pending",
    clientEmail: "timezone.off@australia.au", gmailThreadId: "thread_demo_067",
    messages: [
      { body: "All my tickets show timestamps 11 hours behind. I'm in AEDT (UTC+11) but the system seems to use UTC. Can I set my timezone?", sender: "timezone.off@australia.au", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d067a" },
      { body: "Go to Settings → Profile → Timezone and select Australia/Sydney. Timestamps will update immediately.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d067b" },
    ],
  },
  {
    id: "ticket_068", subject: "Report shows 0 tickets resolved but agents closed 50", status: "open",
    clientEmail: "manager@brokenstats.com", gmailThreadId: "thread_demo_068",
    messages: [{ body: "The weekly report emailed to me shows 0 resolved tickets but I can see 50 tickets marked closed in the UI. Something is wrong with the report.", sender: "manager@brokenstats.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d068a" }],
  },
  {
    id: "ticket_069", subject: "CSAT survey emails going to wrong address", status: "open",
    clientEmail: "survey.issue@csat.co", gmailThreadId: "thread_demo_069",
    messages: [{ body: "Our CSAT survey emails are being sent to the agent's email instead of the customer's. This started after we updated agent profiles.", sender: "survey.issue@csat.co", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d069a" }],
  },
  {
    id: "ticket_070", subject: "Ticket priority not being respected in queue", status: "pending",
    clientEmail: "priority.matters@urgent.biz", gmailThreadId: "thread_demo_070",
    messages: [
      { body: "Urgent tickets are sitting behind low-priority ones in the queue. The queue should sort by priority first.", sender: "priority.matters@urgent.biz", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d070a" },
      { body: "Queue sorting is configurable under Settings → Queue → Sort Order. Set 'Priority' as the primary sort to ensure urgent tickets surface first.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d070b" },
    ],
  },
  {
    id: "ticket_071", subject: "Cannot delete a ticket — permission error", status: "open",
    clientEmail: "clean.up@deleterequest.com", gmailThreadId: "thread_demo_071",
    messages: [{ body: "When I try to delete a test ticket I created, I get 'You do not have permission to delete tickets'. I'm an admin. What's going on?", sender: "clean.up@deleterequest.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d071a" }],
  },
  {
    id: "ticket_072", subject: "Bulk close tickets not working for more than 50", status: "open",
    clientEmail: "bulk.action@massclose.com", gmailThreadId: "thread_demo_072",
    messages: [{ body: "When I select more than 50 tickets and click 'Close', only the first 50 get closed. The rest stay open. Is there a batch limit?", sender: "bulk.action@massclose.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d072a" }],
  },
  {
    id: "ticket_073", subject: "Email threading broken — replies creating new tickets", status: "open",
    clientEmail: "threading@brokenreplies.com", gmailThreadId: "thread_demo_073",
    messages: [{ body: "Customer replies to our support emails are creating new tickets instead of threading into the existing one. We're getting duplicates.", sender: "threading@brokenreplies.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d073a" }],
  },
  {
    id: "ticket_074", subject: "Can we white-label the customer portal?", status: "pending",
    clientEmail: "brand@whitelabel.agency", gmailThreadId: "thread_demo_074",
    messages: [
      { body: "Our clients should see our brand, not yours, on the support portal. Do you support white-labeling with custom logo and colors?", sender: "brand@whitelabel.agency", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d074a" },
      { body: "White-labeling is available on the Enterprise plan. It includes custom domain, logo, colors, and removing all references to our brand.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d074b" },
    ],
  },
  {
    id: "ticket_075", subject: "How long are tickets retained?", status: "closed",
    clientEmail: "retention@compliance.law", gmailThreadId: "thread_demo_075",
    messages: [
      { body: "For compliance, we need to know how long ticket data is retained after account closure.", sender: "retention@compliance.law", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d075a" },
      { body: "Ticket data is retained for 90 days after account closure, then permanently deleted. You can export all data before closing.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d075b" },
    ],
  },
  {
    id: "ticket_076", subject: "Integration with HubSpot CRM", status: "open",
    clientEmail: "crm@hubspotfan.com", gmailThreadId: "thread_demo_076",
    messages: [{ body: "Is there a native HubSpot integration? We want new tickets to automatically create contacts in HubSpot and sync deal status.", sender: "crm@hubspotfan.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d076a" }],
  },
  {
    id: "ticket_077", subject: "Agent availability status not updating", status: "pending",
    clientEmail: "status@agentdash.com", gmailThreadId: "thread_demo_077",
    messages: [
      { body: "Two of our agents show as 'Online' in the dashboard even though they logged out hours ago. It's affecting ticket routing.", sender: "status@agentdash.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d077a" },
      { body: "This is a known session cleanup bug. We've pushed a fix. Please ask the agents to log back in and their status should update correctly.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d077b" },
    ],
  },
  {
    id: "ticket_078", subject: "Translation plugin conflicting with editor", status: "open",
    clientEmail: "translate@multilingualco.com", gmailThreadId: "thread_demo_078",
    messages: [{ body: "When our browser translation plugin is active, the ticket reply editor breaks — text appears jumbled. Is there a known workaround?", sender: "translate@multilingualco.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d078a" }],
  },
  {
    id: "ticket_079", subject: "Ticket tags not appearing in reports", status: "open",
    clientEmail: "tagging@reportmaster.co", gmailThreadId: "thread_demo_079",
    messages: [{ body: "We tag every ticket but the tag breakdown in the analytics report always shows 0. Tags are definitely being applied — I can see them on individual tickets.", sender: "tagging@reportmaster.co", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d079a" }],
  },
  {
    id: "ticket_080", subject: "Incoming email not parsed correctly — garbled subject", status: "open",
    clientEmail: "email.parse@garbledtest.net", gmailThreadId: "thread_demo_080",
    messages: [{ body: "Emails with non-ASCII characters in the subject line (e.g. Japanese) show as '=?UTF-8?B?...' instead of the actual text. Can you fix the parser?", sender: "email.parse@garbledtest.net", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d080a" }],
  },
  {
    id: "ticket_081", subject: "Reply template variables not resolving", status: "pending",
    clientEmail: "template.broken@vars.fail", gmailThreadId: "thread_demo_081",
    messages: [
      { body: "Our canned replies use {{customer.name}} but the variable isn't being replaced — customers receive the literal string '{{customer.name}}'.", sender: "template.broken@vars.fail", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d081a" },
      { body: "This affects templates created before last week's update. Please re-save the template once to re-register the variables — this will fix it.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d081b" },
    ],
  },
  {
    id: "ticket_082", subject: "How to add CC/BCC to a ticket reply?", status: "closed",
    clientEmail: "cc.help@replyto.me", gmailThreadId: "thread_demo_082",
    messages: [
      { body: "I need to CC my manager on a customer reply. Is there a CC field in the reply composer?", sender: "cc.help@replyto.me", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d082a" },
      { body: "Yes! In the reply composer, click 'CC/BCC' link under the To field to expand those fields. You can add as many addresses as needed.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d082b" },
    ],
  },
  {
    id: "ticket_083", subject: "Ticket search not finding old closed tickets", status: "open",
    clientEmail: "history.search@archiveseek.com", gmailThreadId: "thread_demo_083",
    messages: [{ body: "When I search for a customer's old tickets, only open ones appear. Closed tickets from 6 months ago are missing from search results.", sender: "history.search@archiveseek.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d083a" }],
  },
  {
    id: "ticket_084", subject: "Auto-assignment round-robin not distributing evenly", status: "open",
    clientEmail: "fairness@roundrobin.qa", gmailThreadId: "thread_demo_084",
    messages: [{ body: "One agent is receiving 3x more tickets than others via round-robin. The rule looks correct. Is there a bug in the distribution logic?", sender: "fairness@roundrobin.qa", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d084a" }],
  },
  {
    id: "ticket_085", subject: "Customer submitted ticket but got no confirmation email", status: "pending",
    clientEmail: "no.confirm@portal.com", gmailThreadId: "thread_demo_085",
    messages: [
      { body: "A customer says they submitted a ticket through our portal but never received a confirmation email. The ticket did appear in our system.", sender: "no.confirm@portal.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d085a" },
      { body: "Check the customer's spam folder first. If not there, verify their email in the ticket — if auto-confirm is enabled, a receipt is always sent unless address is invalid.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d085b" },
    ],
  },
  {
    id: "ticket_086", subject: "How to export ticket analytics to PDF?", status: "closed",
    clientEmail: "report.pdf@quarterly.review", gmailThreadId: "thread_demo_086",
    messages: [
      { body: "I need to share the monthly ticket analytics with our board. Can I export the dashboard as a PDF?", sender: "report.pdf@quarterly.review", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d086a" },
      { body: "In Analytics, click the export icon (top right) → Export as PDF. The report renders with all charts and data tables included.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d086b" },
    ],
  },
  {
    id: "ticket_087", subject: "API key rotated — old integrations broken", status: "open",
    clientEmail: "devops@keyrotation.io", gmailThreadId: "thread_demo_087",
    messages: [{ body: "I accidentally rotated an API key that was being used by 3 production integrations. How do I quickly migrate them?", sender: "devops@keyrotation.io", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d087a" }],
  },
  {
    id: "ticket_088", subject: "Is there a sandbox / test environment?", status: "closed",
    clientEmail: "qa.engineer@testenv.dev", gmailThreadId: "thread_demo_088",
    messages: [
      { body: "We'd like to test new workflows and automations without affecting our production data. Is there a sandbox environment?", sender: "qa.engineer@testenv.dev", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d088a" },
      { body: "Yes! Business and Enterprise plans include a sandbox. Go to Settings → Sandbox to clone your configuration and test freely.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d088b" },
    ],
  },
  {
    id: "ticket_089", subject: "Ticket subject editable after creation?", status: "closed",
    clientEmail: "edit.subject@ticketfix.net", gmailThreadId: "thread_demo_089",
    messages: [
      { body: "A customer submitted a ticket with a vague subject. Can agents edit the subject line to be more descriptive?", sender: "edit.subject@ticketfix.net", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d089a" },
      { body: "Yes — click the subject line in the ticket view to edit it inline. Only agents and admins can edit; customers see the original.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d089b" },
    ],
  },
  {
    id: "ticket_090", subject: "Urgent: production down — cannot access platform", status: "open",
    clientEmail: "ceo@criticaloutage.com", gmailThreadId: "thread_demo_090",
    messages: [{ body: "Our entire team cannot access the platform. All logins return 502 Bad Gateway. We have a live customer demo in 30 minutes. URGENT.", sender: "ceo@criticaloutage.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d090a" }],
  },
  {
    id: "ticket_091", subject: "Historical data missing after plan migration", status: "open",
    clientEmail: "migration.panic@dataloss.co", gmailThreadId: "thread_demo_091",
    messages: [{ body: "We just migrated from Starter to Pro. Now our ticket history from before February is gone. We need that data — it's critical for an audit.", sender: "migration.panic@dataloss.co", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d091a" }],
  },
  {
    id: "ticket_092", subject: "Email signature disappears on reply", status: "pending",
    clientEmail: "signature@emailpro.com", gmailThreadId: "thread_demo_092",
    messages: [
      { body: "My email signature is set in profile settings but doesn't appear when I hit Reply on a ticket. It shows for new tickets but not replies.", sender: "signature@emailpro.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d092a" },
      { body: "This is a bug with reply mode — signature injection for replies is a known issue in v3.1. Fixed in the upcoming v3.2 release next week.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d092b" },
    ],
  },
  {
    id: "ticket_093", subject: "Need to restrict agents to specific ticket categories", status: "open",
    clientEmail: "team.structure@specialized.com", gmailThreadId: "thread_demo_093",
    messages: [{ body: "We want agents to only see tickets in their department (Billing, Technical, Sales). Can we restrict ticket visibility by category?", sender: "team.structure@specialized.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d093a" }],
  },
  {
    id: "ticket_094", subject: "Duplicate ticket auto-detection?", status: "closed",
    clientEmail: "dupe.detect@smartqueue.ai", gmailThreadId: "thread_demo_094",
    messages: [
      { body: "We get many duplicate tickets from the same customer. Can the system automatically flag or merge duplicates?", sender: "dupe.detect@smartqueue.ai", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d094a" },
      { body: "Enable duplicate detection under Settings → Tickets → Duplicates. It uses subject similarity and sender email to flag likely duplicates for agent review.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d094b" },
    ],
  },
  {
    id: "ticket_095", subject: "Ticket response time showing 0 in reports", status: "open",
    clientEmail: "metrics@slatracking.com", gmailThreadId: "thread_demo_095",
    messages: [{ body: "Our first-response-time metric shows 0:00 for all tickets this month. It was showing correctly last month. Did something change?", sender: "metrics@slatracking.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d095a" }],
  },
  {
    id: "ticket_096", subject: "Incoming tickets from newsletter tool marked as spam", status: "pending",
    clientEmail: "newsletter@emailflow.com", gmailThreadId: "thread_demo_096",
    messages: [
      { body: "Replies from our newsletter tool (Mailchimp) are being flagged as spam before reaching the helpdesk. How can I whitelist Mailchimp's sending IPs?", sender: "newsletter@emailflow.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d096a" },
      { body: "Add the Mailchimp IP ranges to your email whitelist under Settings → Email → Sender Whitelist. Our docs link the current Mailchimp IP ranges.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d096b" },
    ],
  },
  {
    id: "ticket_097", subject: "Cannot format text in ticket reply — bold/italic not working", status: "open",
    clientEmail: "rich.text@formattingfail.com", gmailThreadId: "thread_demo_097",
    messages: [{ body: "The bold and italic buttons in the reply editor are greyed out. I can't apply any formatting. This started after the update this morning.", sender: "rich.text@formattingfail.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d097a" }],
  },
  {
    id: "ticket_098", subject: "Ticket auto-close after inactivity — can we change the delay?", status: "closed",
    clientEmail: "config@autoclose.settings", gmailThreadId: "thread_demo_098",
    messages: [
      { body: "Tickets are auto-closing after 7 days of inactivity. We'd like to extend this to 30 days. Is that configurable?", sender: "config@autoclose.settings", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d098a" },
      { body: "Yes — go to Settings → Tickets → Auto-close and set the inactivity period. Min is 1 day, max is 90 days.", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d098b" },
    ],
  },
  {
    id: "ticket_099", subject: "Agent photo not uploading — file too small error", status: "open",
    clientEmail: "profile.pic@avatarissue.com", gmailThreadId: "thread_demo_099",
    messages: [{ body: "When I try to upload my profile photo I get 'Image is too small — minimum 200x200px'. My image is 512x512. This error doesn't make sense.", sender: "profile.pic@avatarissue.com", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d099a" }],
  },
  {
    id: "ticket_100", subject: "Quarterly review: can we get a usage report?", status: "pending",
    clientEmail: "account.review@enterprise.client", gmailThreadId: "thread_demo_100",
    messages: [
      { body: "We're preparing for our quarterly business review. Can you generate a usage report showing ticket volume, response times, and AI auto-reply rate for Q1?", sender: "account.review@enterprise.client", senderType: "customer", direction: "inbound", gmailMessageId: "msg_d100a" },
      { body: "I'll pull that report and send it over within 24 hours. Would you also like a call with your account manager to walk through the data?", sender: "support@helpdesk.com", senderType: "agent", direction: "outbound", gmailMessageId: "msg_d100b" },
    ],
  },
];

for (const { messages, ...ticket } of tickets) {
  await prisma.ticket.upsert({
    where: { gmailThreadId: ticket.gmailThreadId },
    create: {
      ...ticket,
      messages: { create: messages.map((m) => ({ ...m, id: `${m.gmailMessageId}_rec` })) },
    },
    update: {},
  });
}

console.log(`Seeded ${tickets.length} example tickets.`);
await prisma.$disconnect();
