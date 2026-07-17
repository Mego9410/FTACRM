# Frank Taylor & Associates — iamproperty CRM: Feature Inventory

_Live running list, compiled while screenshotting crm.iamproperty.com. Business context: FTA is a dental-practice sales/valuation brokerage using an estate-agency CRM (iamproperty) repurposed for that — "Properties" = dental practices for sale, "Vendors" = practice sellers, "Applicants" = buyers._

## Top-level navigation (global header)
- **My day** — personal dashboard/homepage (`/MyDay`)
- **Sales** (dropdown megamenu) — Sales Dashboard, Properties, Vendors, Applicants, Solicitors, Property Match, Applicant Match, Reports, Marketing toolkit (New), Sales Progression, Upload to portals, E-sign
- **Reporting** (dropdown) — Management information, Branch activity, Reports (submenu)
- **Communications** (dropdown) — Email Merge, Email Tracker, E-Sign, Mail Merge, Marketing toolkit (New), SMS Merge
- Utility icons (top right): grid/apps launcher, Calendar, Notifications (bell, badge count), global Search, "My account" menu
- Cross-product bar (top far right, group-wide): iamproperty, CRM (current), movebutler, iamsold — sibling products in the same group, not part of this CRM rebuild

## My Day (dashboard, `/MyDay`)
- Welcome banner with user's first name
- Dismissible promo banner (cross-sell for another product, e.g. "Market Appraisals")
- "Add New Record" primary CTA (quick-create)
- "Visit help centre" link
- Global "Search all records" box
- "Today's events" widget (empty state, "Add new event", "View calendar")
- "My tasks" widget (empty state, "Add new task", "View all tasks")
- Footer shows app version/build id (e.g. `2.52.0_16072026_19 | OV-2`)

## Sales Dashboard (`/Dashboards/Sales`)
- KPI tiles with live counts + quick-add (+): Properties, Vendors, Applicants, Sales Progression, Pending Offers, Portals, Key Control
- Tab strip: Properties / Vendors / Applicants / Sales Progression / Pending Offers / Portals / Key Control
- "Activity List" panel (left) — saved/system smart-lists with counts, each opens in new tab (external-link icon), e.g.:
  - Agency Contracts Expiring
  - Applicants Not Contacted
  - Appraisals Requiring Conclusion
  - Sales Progression
  - Tenure Expiring
  - Upcoming Appraisals
  - Vendors Not Contacted
  - Viewings Requiring Feedback
  - Unconfirmed Viewings
  - Upcoming Viewings
  - Pending Offers
- Settings gear + refresh icon on Activity List (customizable list)
- Right pane: "Please select an activity list item to begin" (drill-down detail view)

## Search / Explore (`/Search#tab...`)
- Explore banner per entity type ("Explore your sales properties")
- Entity tabs with live counts: Sales Properties, Vendors, Sales Applicants, Solicitors
- Search-as-you-type box (name or address), with `#all` operator to return everything
- Filter checkboxes: Available, Sold/Under Offer, Appraisal, Archived
- Sort/segment toggle: Latest Added / Favourites
- Card-grid results with pagination arrows; each card shows: status badge (Sales/Appraisal), favourite/heart toggle, price, address, bed/bath/reception counts (real-estate fields reused for practices)

## Property record (`/Sales/Property/Record/{id}`)
Header: address, price, bed/bath counts, status badges (e.g. Appraisal, WARNING), lead vendor (with link), "View Vendors", quick-action icons (calendar, people, map pin, camera, home, overflow "more"). Top control strip: Reference, Negotiator (assigned staff, dropdown), Branch (dropdown), Status (dropdown, e.g. Valuation).

Left sub-navigation (record has ~20 tabs):
- **Details** — Property Pictures (upload), Property Address (postcode lookup + edit), Price/Instructed Date (prefix, price, currency, instructed date, notice-to-withdraw date, withdrawn date), Solicitor/Conveyancing (instructed toggle, solicitor picker, contact, address, email, phone, mobile, fax, +Add Solicitor), Fees/Contract (contract type, contract expiry, fee amount £/%, commission £/%, solicitor referral fees, property marketing fees), Commercial (Commercial Unit toggle)
- **Checklist** — (task/compliance checklist per property)
- **Appraisals** — appraisal records/history
- **Compliance** — compliance tracking (AML etc.)
- **Information** — additional property info fields
- **Stats** — property performance stats
- **Marketing** — marketing status/description/copy
- **Media** — photos/floorplans/video/EPC assets
- **Rooms** — room-by-room details (beds/baths etc. — vestigial from residential real estate)
- **Portals** — portal syndication status (Rightmove-style portals)
- **Viewings** — viewing bookings/feedback
- **Offers** — offers made on this record
- **NOI** — (Notice of Interest / Notice of Instruction — TBC)
- **Enquiries** — inbound enquiries against this listing
- **Key Control** — key/access tracking
- **Sub-Agent** — sub-agent assignment
- **Contacts** — associated contacts
- **Documents** — file attachments
- **Journal** — activity/communication log (notes, calls, emails timeline)
- **Matched applicants** — auto-matched buyer applicants
- **Audit** — audit trail of record changes
- Save button (floating, bottom right)

### Property record tabs — detail

- **Checklist** — named checklist templates (e.g. "Launch prep") with N items, each a checkbox + label + per-item edit icon + per-item "save as template" icon; header shows "X of Y checked"
- **Appraisals** — list of appraisal/valuation appointments (date-boxed cards, left column) + detail pane per appointment: Valuation Appointment (Valuers multi-select, Appointment Booked toggle, Appointment Confirmed toggle, Appointment Date+time, Duration), Valuation (Price From, Price To, Vendor [expectation], Suggested, Fee Amount %/£ toggle), nested Checklist section (per-appraisal checklist), Delete/Save actions, "+Add Appraisal"
- **Compliance** — Energy Efficiency (Current/Potential rating 1-20, e.g. band G), Environmental Impact CO2 (Current/Potential), EPC Image (Generate & Preview from entered values, links to national/Scottish EPC registers, drag-drop upload), Additional EPC Information (RRN Number, Expiry date) — vestigial residential-EPC feature, likely unused for dental practices
- **Information** — UK Council dropdown, Council Tax Band + Exempt toggle (with link to check band), Select Occupier; Tenure (years slider, Type, Expiry Date); Shared Ownership (toggle, %, Rent, Rent Frequency); Alarm (Alarmed toggle, Alarm Code) — all vestigial residential fields
- **Stats** — Rightmove Click Statistics (portal analytics), Last 7 Days / Last 28 Days / Total (Viewed vs Searched % + counts), Important Information summary (Instructed Date, Last Contacted, First/Last Viewing, Total Viewings, First/Last Offer, Total Offers, Withdrawn, Exchanged, Completed, Accepted, Fallen Through, Invoiced)
- **Marketing** — Prices and Matching (Prefix, Price, Bedrooms, Bathrooms, Receptions — matching criteria fields), Property Advertising (Advertise? checkbox — gates the Portals tab, New build? checkbox, Board Status, Advertising Address, Advertising Status, Advertising URL, Virtual Tour URL 1/2, Premium Listing dropdown, Coming to market toggle + date), Matching Property section (below fold)
- **Media** — Add Media button, Sort, Search, Clear filters, Media type filter (Image / Floorplan / EPC / 360), gallery grid, empty-state illustration
- **Rooms** — Add Room button, Sort Rooms, Search, Clear filters, empty-state ("No rooms available") — vestigial residential feature
- **Portals** — portal syndication; blocked with a toast error ("Please select 'Advertise' in the Marketing tab first!") until Marketing → Advertise is enabled — validation dependency between tabs
- **Viewings** — Add Viewing, Sort, Date Range picker, Search, Clear filters, Status filter chips (Upcoming, Old Viewings, Confirmed, Not Confirmed, Not Cancelled, Deleted Viewings, Not Deleted Viewings), grid/list view toggle, count ("0 Viewings Found")
- **Offers** — Add Offer, Sort, Date Range, Search, Clear filters, Status filter chips with live counts (Accepted, Declined, Fallen Through, Pending, Under Offer, Withdrawn), grid/list toggle
- **NOI** ("Notes"/closing-date tracking — likely "Notice of Interest"/sealed-bid deadline) — Add Note, Closing Date field + "Closing Date Set" toggle, Sort, Search, filter by "Added By"/negotiator, print icon, count
- **Enquiries** — New Enquiry, Sort, Date Range, Search, Clear filters, empty state
- **Key Control** — Add Key, empty state ("No keys available") — physical key tracking for access/viewings
- **Sub-Agent** — Add Sub Agent / "Add New", empty state — co-agency/referral partner assignment
- **Contacts** — Sort, Search, Clear filters, contact cards (avatar initials, name, email, phone, "View Vendor" link) — shows people linked to this listing
- **Documents** — Add Document, Sort, Search, Clear filters, empty state
- **Journal** — New Journal, Sort, Date range, Search, filter by team member and by type (Call / Email / Note), reverse-chronological entries each showing avatar, author, timestamp, type, linked record, expandable body text (call notes, email content, status-change system entries)
- **Matched applicants** — auto/manual applicant-to-property matching list (empty state "No matches found")
- **Audit** — full field-level change history table: Date, User, Field, Old Value, New Value, paginated, searchable — covers every editable field across all tabs (appraisal fields, status, owner, etc.)

## Vendor record (`/Sales/Vendor/Record/{id}`)
Header: avatar (initials), name, email, phone, linked property address, status pills (VE type badge, "Warning", "Set GDPR" button), quick-action icon bar (call, mobile-call, SMS, chat/message, email, overflow). Top strip: Reference, Negotiator, Branch, Status (e.g. Active). Left status summary: Properties (count), Identity Confirmed (pass/fail), Address Confirmed (pass/fail), Last Contacted.

Left sub-nav tabs: **Details** (Personal Information: Title/Forename/Surname/Company/Salutation/Website/Phone/Work phone/Mobile/Email/Source; Vendor Address: Address type, Postcode lookup, House/Line1/Line2/Town/County/Country; Contact Notes rich-text editor), **Checklist**, **Properties** (linked property cards with ratings, price, beds/baths/receptions, assigned negotiator, date), **Contacts**, **Documents**, **Journal**, **E-Sign** (table: Sender, Letter, Email Subject, Status, Created, Sent, Completed, Envelope — e-signature audit trail), **Audit**.

Compliance concept: "Identity Confirmed" / "Address Confirmed" flags suggest built-in AML/KYC verification tracking on vendors.

## Applicant record (`/Sales/Applicant/Record/{id}`)
Header: avatar, name/email/phone, linked address, status pills (type badge, Warning, Set GDPR), quick-action icons. Top strip: Reference, Negotiator, Branch, Status (e.g. "First Time Buyer"). Left status summary: Latest Offer (£), Offer Status, Applicant Status, Applicant Temp[erature] (hot/warm/cold lead scoring), Created, Last Contacted.

Left sub-nav tabs: Details, Checklist, Viewings, Offers, Linked Applicants (joint buyers), Contacts, Documents, Journal, Matched properties, E-Sign, Audit.

**Details tab** fields:
- Personal Information: Title, Forename, Surname, Company Name, Website, Phone Number, Work phone, Mobile phone, Email Address, Salutation, Source, **Temperature** (lead-scoring dropdown)
- Applicant Address: Postcode lookup, Address, "Edit Manually"
- Contact Notes (rich text — seen holding free-text like purchasing-partner name)
- **Applicant Criteria** (buyer-matching engine, drives Property Match / Applicant Match):
  - Search for area — free-text area search + radius (Miles/¼ Mile granularity), "Add area" → chips per area (editable/removable), seen with multiple UK regions stacked (OR logic)
  - Min Price / Max Price
  - Minimum Bedrooms / Minimum Bathrooms (stepper)
  - Move In Date, Buyer Position dropdown
  - Property type (toggle list, searchable): House, Apartment, Flat, Maisonette, Bungalow, Other, Land...
  - Property style (toggle list): Detached, End Terrace, House Share, Link Detached, Mews, Semi-Detached, Terraced...
  - Property attributes (free toggle list, empty in sample)
  - Rightmove type (portal category mapping): Apartment, Bar/Nightclub, Barn, Barn Conversion...
  - **Property age → repurposed as deal-structure type**: Affiliate, Associate, Associate – Practice only, Associate Plus
  - **Custom style → repurposed as clinical specialism**: Endodontist, Hygienist, Implantologist, Oral Surgeon...
  - **Other Criteria → repurposed as ownership/funding structure**: "FH Mixed|Freehold", "FH NHS|Freehold", "FH Private|Freehold", "FH/LH Mixed|FH or LH" (FH=Freehold, LH=Leasehold, NHS/Private/Mixed = practice funding mix)
- Additional Information: Has property to sell (dropdown), Requires a mortgage (dropdown), Do you require a valuation (dropdown), free-text notes

**Domain-model insight**: FTA has taken iamproperty's stock real-estate taxonomy fields (bedrooms/property-type/property-style/property-age/custom-style/rightmove-type) and relabeled/repurposed them as dental-industry-specific classification (specialism, deal structure, ownership/funding type) rather than customizing the schema — a rebuild should make these first-class, named fields (specialism, dealStructure, fundingType) instead of reusing generic real-estate slots.

## Solicitor / generic Contact record (`/Contacts/Record/{id}`)
Solicitors (121 records) are NOT a separate entity — they're the same underlying **Contact** model as Vendors/Applicants, discriminated by a **Contact Type** dropdown (seen value: "Solicitor"). Header shows warning/GDPR badges, quick-action icons (call, SMS, email), and a "Contact of: {Company}" badge linking to a parent organization record. Fields: Contact Type, Title, Forename, Surname, Website, Phone, Work phone, Mobile (with SMS icon), Email (with mail icon), Fax. Address block below (Address type, etc.). Left nav (simpler than Vendor/Applicant): Details, Documents, Journal, Audit.

**Rebuild implication**: model a single `Contact` entity with a `type` enum (Vendor, Applicant, Solicitor, Sub-Agent, ...) and type-specific extension data, rather than separate tables per contact role — matches what iamproperty already does.

## Sales Progression (`/Sales/SalesProgression`) — post-offer pipeline
A firm-wide visual pipeline of every deal past offer-acceptance, 420 records for FTA. Left filters: Sort by (e.g. "Closest to Completion"), Negotiators, Status checkboxes (In Progress, Completed, Pending, Lost/Withdrawn), Update Results. Global property search bar. Each deal is a horizontal 7-step tracker: **Offer Accepted → Solicitors Instructed → Searches Ordered → Mortgage Offer → Searches Back → Contracts Exchanged → Completion**, colour-coded green (done, with date achieved) / amber (current, pulsing "play" icon) / red (upcoming), plus deal header (date, price, buyer name, property name/address, "Last Updated" or a "Completed" badge for finished deals).

**Rebuild implication**: this is a first-class Kanban/stepper pipeline entity per deal (Offer → Completion) with a fixed stage list, stage timestamps, and negotiator/status filtering — worth building as its own module, not just a status field on Property.

## Matching tools (`/Matching/MatchingProperties`, `/Matching/MatchingApplicants`)
Single UI toggled between "Properties" and "Applicants" mode:
- **Property Match** (finds properties for a chosen applicant): Select Applicant, Clear filters, Min/Max Price, Minimum Bedrooms, "Match Areas" toggle, "Use additional filters" — results are a map-thumbnail card grid (price, address, beds/baths/receptions, negotiator, date), grid/list toggle, sort.
- **Applicant Match** (finds applicants for a chosen property): Select Property, Max Price, Bedrooms, Match Areas, Move From/Move To date range, additional filters — results are applicant cards.
- Right-hand action rail on both, with a running "N Selected" counter: **Viewing** (book a viewing for selected), **Preview & Send Email**, **Send Email**, **SMS** — i.e. bulk actions operate directly on the match result selection.

## Reports (`Sales → Reports`, modal + `Reporting → Reports`)
- Sales-menu "Reports": modal "Produce Report" with a single "Select Report" dropdown + "Run Report" — quick, single ad-hoc report picker.
- Reporting-menu "Reports": full page with three categories — **General**, **Batch Reports**, **Sales** — a broader report library (categories confirmed; individual report names not fully enumerated during this pass).

## Reporting → Management information (`/Dashboards/ManagementInfo`)
Filter panel: Area (e.g. Sales), Branch, Negotiator, Current Period / Previous Period date ranges, Go, "Email Charts" (send the dashboard by email). Widget grid: **Records**, **Gross Sales** (current vs previous period, collapsible), **Instructions** (Pipeline Fees £, Pipeline Units, Average Fee % , Average Fee £), **Average House Price** (current vs previous, up/down trend arrow) — a KPI/BI dashboard comparing two custom periods, sliceable by branch/negotiator.

## Reporting → Branch activity (`/BranchActivity/BranchActivity`)
Firm-wide journal/activity feed (superset of the per-record Journal tab): filter by negotiator (chips per team member: e.g. Georgia Ridgewell-May, Chris Strevens, Henry Stevens, Liz Hughes, Electra Giannikou, Emma Mumby, Andy Acton), by entry type (File, Note, Email, SMS, Call), by date range, with search. Each row shows author, timestamp, type, message preview, and the linked Property/Applicant record. Effectively a company-wide CRM activity stream — can be slow to load with a large history (420+ live deals, thousands of contacts).

## Communications tools
- **Email Merge** (`/Communications/MassEmail`): Record Type selector (drives available merge fields), Templates dropdown (+ save template), Recipients picker (bulk, "N Recipients Selected"), Subject, "Include Email Signature" toggle, "Track Emails" toggle, full WYSIWYG editor (File/Edit/View/Insert/Format/Tools/Table menus, image insert, code view, tables, font/size, alignment, lists, text colour/highlight, links), "Template Tags" panel (merge-field tokens for the selected record type), drag-drop media upload, Drafts (resume a saved draft), Send Email.
- **Email Tracker** (`/Communications/EmailTracker`): sent-email log with Date Type (e.g. Date Sent), Employee filter, Date Range, Search, and Show Read / Show Unread / Show Unsent toggles — open/read tracking per email.
- **Mail Merge** (`/Communications/LetterMailMerge`, "Mail Merge" + the Sales-menu "E-sign" area's sibling): Record Type, Letters (letter template), Recipients, Email Templates, Email Subject, **Generate PDF** / **Generate Word** buttons; a "Generated letters" table (File Type, File Name, Recipient, Date Created, Email Sent, Status, Download, paginated) with bulk actions Refresh / Save to Documents / Send Email / Download selected / Clear Selected.
- **SMS Merge** (`/Communications/MassSMS`): Record Type, Templates (+save), Recipients, Drafts, message textarea, Template Tags, live phone-mockup preview, Send SMS.
- **E-Sign** (global dashboard `/Dashboards/ESign`, plus per-Vendor/Applicant E-Sign tabs): KPI tiles Total / Unsent / Sent / Completed / Cancelled / Hidden; filterable table (Sender, Letter, Email Subject, Status, Created, Sent, Completed, Envelope Id); Date Type/Range, Search, Show Cancelled/Hidden toggles. Requires an "E-Sign integration key" to be configured to send documents (DocuSign-style e-signature integration).
- **Marketing toolkit**: currently an unactivated upsell module ("Stand out with our Marketing Toolkit" — expert data, Market Appraisals add-on, campaigns, automations) — not in active use by FTA; skip unless the user wants it emulated.

## Calendar (`/CalendarV2`)
Full shared team calendar (Month/Week/Day, Today, print, date range nav). Filters: Add Event, Reset filters, Calendar type, Event type, Branch, Sync Outlook events toggle, Sync Google events toggle, Hide cancelled events toggle, user search, and a per-teammate checklist with colour swatches to overlay/hide individual calendars (e.g. Oliver Acton (Me), All Archive, Andy Acton, Chloe Charalambos, Chris Strevens, Craft Computers, David Brewer, Drew Acton...), "Show only my events". Events are colour-coded by type (holiday, webinar, meeting, appraisal — appraisal events show a small checkmark/property-link icon). "New calendar" toggle + Settings.

## Global chrome (present on every page)
- **Notifications bell**: dropdown list with "Clear all", per-item mark-as-read; seen holding system release-note announcements.
- **Global search** (magnifying glass icon): full-screen overlay, "Type your search and press enter…", branded iamproperty splash.
- **Apps grid icon**: quick-nav/quick-create dropdown — Active branches, Calendar, **Add new record**, Calls, Contacts, Events, Notes, Tasks.
- **My account menu**: user name/avatar header, Active branches, Account settings, **Control Centre** (expandable admin area), Help centre, Log out.
- Cross-product bar (top-right, outside this app): iamproperty / CRM (current) / movebutler / iamsold — sibling products in the same corporate suite, out of scope for the CRM rebuild.

## Control Centre — admin/config area (`/ControlCentre/...`)
Expands to: **Dashboard**, **Users**, **Configuration**, **Branches**, **Company**, **Property Management Settings**, Help centre.

- **Users** (`/ControlCentre/Users`): Add New User, search, paginated list (Name, Email, Username; 26 users over 3 pages), filters by Branch and Filter Status, and by contact-type tag (Contractors, Employees, Landlords, Lettings Applicants, Sales Applicants, Tenants, Vendors — confirming the unified Contact model extends to internal users too). Right rail shows the licensing/permissions model: **Modules** the org has enabled (Control Centre, E-Sign, Management Info, Reporting Dashboard, Sales, SalesAutomation) and **Roles** available (Administrator, Negotiator, Property Manager).
- **Configuration** (`/ControlCentre/Configuration`): a settings workspace scoped to a Branch, with sub-sections General, Accounts, Data Transfer, Market Appraisal, **UDFs** (User-Defined Fields), **Checklists**, **Lookups** (Common / Sales), Reports, Matching Templates, Viewing Templates, SMTP, SMS, Letters, E-Sign, Portals (and more below the fold, not fully scrolled).
  - **General settings** seen: GDPR contact preferences (Use Defaults, Do Not Contact, Email/Letter/SMS/Phone consent toggles, Third Party, Allow Marketing), Applicant matching defaults (Matching Area toggle), Landlord portal (Restrict Landlord Portal), My day defaults (Only Show Due Or Overdue Tasks), Compliance checks (Portal feed compliance control).
  - **Lookups → Sales**: an admin editor for picklist values — "Select a Lookup to Edit" dropdown, then a two-pane Options Available / Selected Options mover (Add / Add All / Remove / Remove All) plus "Add New Lookup". **This is the mechanism behind the repurposed taxonomy fields** seen on the Applicant record (property type/style/age/custom style/rightmove type) — they are admin-editable named lists, not hardcoded, which is how FTA relabeled "Property Age" into deal-structure values and "Custom Style" into clinical specialisms without any code change.

_(All major navigation areas now explored: My Day, Sales dashboard + all 4 entity types (Property/Vendor/Applicant/Solicitor) + all property-record tabs, Property/Applicant Match, Reports, Sales Progression, Upload to Portals, E-Sign, Reporting (Management Info, Branch Activity, Reports), Communications (Email/Mail/SMS merge, Email Tracker, E-Sign), Calendar, global chrome, and Control Centre admin/config including the Lookups mechanism. See the Rebuild Notes section below for a synthesis.)_

---

## Rebuild notes / architecture synthesis

**Core entity model**: a single polymorphic `Contact` (Vendor, Applicant, Solicitor, Sub-Agent, internal User, ...) discriminated by type, plus a `Property` (dental practice listing) entity, an `Offer` entity, a `SalesProgression`/deal pipeline entity (7 fixed stages), and an `Appraisal`/valuation-appointment entity. Every major entity carries: Journal (timestamped Call/Email/Note/system-log activity feed), Documents, Audit (field-level change history), Checklist (admin-defined template, instance per record), and E-Sign envelopes.

**Repurposed real-estate taxonomy**: FTA runs a dental-practice brokerage on top of an off-the-shelf estate-agency CRM. Rather than customizing schema, they reused generic real-estate picklist/taxonomy slots (bedrooms, property type, property style, "property age", "custom style", "Rightmove type", tenure) and relabeled the values through the admin Lookups editor to mean dental-industry concepts: clinical specialism (Endodontist, Hygienist, Implantologist, Oral Surgeon), deal/engagement structure (Affiliate, Associate, Associate – Practice only, Associate Plus), and ownership/funding mix (NHS/Private/Mixed, Freehold/Leasehold). A ground-up rebuild should make these **first-class named fields** (e.g. `specialism`, `dealStructure`, `fundingType`, `tenureType`) rather than reusing generic slots — same functionality, clearer data model, and removes vestigial residential-only features (Rooms, EPC/Compliance, Council Tax/Tenure, Alarm) that don't apply to practice sales at all.

**Matching engine**: applicants store rich, admin-configurable search criteria (area + radius with OR-able multiple areas, price range, min beds/baths, move-in date, buyer position, plus all the repurposed taxonomy toggles) that feed a bidirectional match tool (property→applicants and applicant→properties) with inline bulk actions (book viewing, email, SMS) on the match result set.

**Deal lifecycle modules to replicate**: Appraisal (valuation appointment scheduling + price range) → Property listing (marketing, media, portals) → Applicant matching/viewings → Offer → Sales Progression (7-stage pipeline to Completion) → Journal/Audit throughout. Plus supporting modules: Communications (mass email/SMS/letter merge with templates and merge-tag support), E-Sign, Calendar (shared, multi-user, colour-coded, external calendar sync), Reporting (KPI dashboard with period-over-period comparison + a firm-wide activity/journal stream + report library), and admin Control Centre (Users with role/module-based permissions, Branches, Company settings, and the Lookups/UDF/Checklist/Template configuration system that lets the whole taxonomy be relabeled without code changes).

## Entities identified so far
- **Property** (dental practice for sale) — 4,240 records
- **Vendor** (practice seller) — 4,772 records
- **Applicant** (prospective buyer) — 9,682 records
- **Solicitor** — conveyancing contacts
- **Offer** — 32 pending
- **Sales Progression** — post-offer pipeline, 138 in progress
- **Appraisal** — pre-listing valuation stage
