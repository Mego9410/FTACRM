# Rebuild brief: Frank Taylor & Associates CRM

Hand this file, `features.md`, and the `crm_screenshots/` folder to Claude Code as the starting context for rebuilding FTA's CRM from scratch.

## What this system is
FTA is a dental-practice sales & valuation brokerage. The current CRM is iamproperty — an off-the-shelf **estate agency** CRM — repurposed wholesale for brokering dental practice sales instead of houses. "Properties" are practices for sale, "Vendors" are practices' selling dentists, "Applicants" are prospective buyer dentists/corporates, "Solicitors" are conveyancing contacts. Real-estate-only vestigial features (Rooms, EPC/Energy Compliance, Council Tax, Tenure, Alarm) show up throughout and should be **dropped**, not replicated, in the rebuild.

## Read first
- `features.md` — full feature inventory, screen-by-screen, with every tab/field enumerated for Property, Vendor, Applicant, and Solicitor records, plus every other module (Sales Progression, Matching, Reporting, Communications, Calendar, Control Centre admin).
- `crm_screenshots/` — ~90 numbered screenshots taken in the order features.md describes them; open in sequence for visual reference on layout/spacing/component style.

## Suggested build order
1. **Core entities**: a polymorphic `Contact` (type: Vendor / Applicant / Solicitor / SubAgent / User), `Property` (the practice listing), `Offer`, `Appraisal`, and a `SalesProgression` deal-pipeline entity with a fixed 7-stage tracker (Offer Accepted → Solicitors Instructed → Searches Ordered → Mortgage Offer → Searches Back → Contracts Exchanged → Completion).
2. **First-class taxonomy fields** instead of iamproperty's repurposed real-estate slots: `specialism` (Endodontist / Hygienist / Implantologist / Oral Surgeon / ...), `dealStructure` (Affiliate / Associate / Associate–Practice only / Associate Plus), `fundingType` (NHS / Private / Mixed), `tenureType` (Freehold / Leasehold / Mixed). Make these admin-editable lists (see "Lookups" in features.md) from day one.
3. **Per-record shared modules**: Journal (Call/Email/Note/system-log activity timeline), Documents, Audit (field-level change history), Checklist (admin-defined template, per-record instance), Contacts (linked people).
4. **Matching engine**: applicant search criteria (area+radius, price range, specialism/dealStructure/fundingType filters, move-in date) driving a bidirectional match view (property→applicants, applicant→properties) with bulk actions (book viewing, email, SMS) on selected matches.
5. **Communications**: mass email/SMS/letter merge with templates + merge tags, email open/read tracking, e-signature envelopes (status: unsent/sent/completed/cancelled).
6. **Calendar**: shared multi-user calendar, colour-coded event types, per-teammate show/hide, appraisal-appointment linking back to the Property record.
7. **Reporting**: a KPI dashboard comparing a current vs. previous custom period (gross sales, pipeline fees/units, average fee %, average sale price) sliceable by branch/negotiator, plus a firm-wide activity/journal feed.
8. **Admin (Control Centre)**: Users with role (Administrator / Negotiator / Property Manager) and module-based permissions, Branches, Company settings, and the Lookups/Checklist/Template configuration system so the business can relabel taxonomy without a code change (this is the single biggest lesson from how FTA runs the current system).

## Explicitly out of scope
Rooms, EPC/Energy Efficiency compliance, Council Tax/Tenure/Shared-Ownership/Alarm fields, "Marketing toolkit" (unactivated upsell module), and the cross-product bar (movebutler/iamsold/iamproperty) — all vestigial from the real-estate origin or unused add-ons, not part of FTA's actual workflow.
