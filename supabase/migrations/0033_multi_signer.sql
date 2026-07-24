-- Multi-party signing. A signature_request is the document container; each party
-- who must sign gets a row in signature_signers with its own secure token and a
-- slot_key mapping it to a {{signature}} / {{signature:key}} slot in the body.
-- The request is fully "signed" only once every signer has signed.

-- The request-level signer columns become legacy (a single default signer is now
-- represented in signature_signers), so relax their NOT NULLs.
alter table public.signature_requests alter column signer_name drop not null;
alter table public.signature_requests alter column signer_email drop not null;
alter table public.signature_requests alter column token drop not null;

create table if not exists public.signature_signers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.signature_requests (id) on delete cascade,
  slot_key text not null default '',      -- '' = default {{signature}}; else {{signature:key}}
  party_label text not null,              -- "Seller", "Purchaser", "Signatory"
  signer_name text not null,
  signer_email text not null,
  token text not null unique,
  sign_order int not null default 0,
  status text not null default 'sent'
    check (status in ('sent', 'viewed', 'signed', 'declined')),
  signature_name text,
  signature_image text,
  signed_at timestamptz,
  viewed_at timestamptz,
  signer_ip text,
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, slot_key)
);
create index if not exists signature_signers_request_idx on public.signature_signers (request_id);
create index if not exists signature_signers_token_idx on public.signature_signers (token);
drop trigger if exists signature_signers_updated on public.signature_signers;
create trigger signature_signers_updated before update on public.signature_signers
  for each row execute function public.set_updated_at();

alter table public.signature_signers enable row level security;
drop policy if exists signature_signers_select on public.signature_signers;
create policy signature_signers_select on public.signature_signers for select to authenticated using (true);
drop policy if exists signature_signers_insert on public.signature_signers;
create policy signature_signers_insert on public.signature_signers for insert to authenticated with check (true);
drop policy if exists signature_signers_update on public.signature_signers;
create policy signature_signers_update on public.signature_signers for update to authenticated using (true) with check (true);

-- Backfill: existing single-signer requests become one signer row (default slot).
insert into public.signature_signers
  (request_id, slot_key, party_label, signer_name, signer_email, token, status, signature_name, signed_at, viewed_at, signer_ip)
select
  id, '', 'Signatory', coalesce(signer_name, 'Signatory'), coalesce(signer_email, ''), token,
  case status when 'signed' then 'signed' when 'viewed' then 'viewed' when 'declined' then 'declined' else 'sent' end,
  signature_name, signed_at, viewed_at, signer_ip
from public.signature_requests
where token is not null
  and not exists (select 1 from public.signature_signers s where s.request_id = signature_requests.id);

-- Point the Heads of Agreement at named signature slots so both parties can sign.
update public.document_templates
set body_html = $body$
<div style="font-family: 'Hanken Grotesk', Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #1a1a1a; line-height: 1.65; font-size: 14px;">
  <h1 style="font-size: 20px; margin: 0 0 4px;">Heads of Agreement</h1>
  <p style="margin: 0 0 20px; font-style: italic;">Subject to contract</p>
  <p style="text-align: right; margin: 0 0 18px;">{{date.today}}</p>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
    <tr><td style="vertical-align: top; padding: 2px 8px 2px 0; font-weight: 600; width: 110px;">Practice:</td><td style="vertical-align: top; padding: 2px 0;">{{practice.name}}, {{practice.address_inline}}</td></tr>
    <tr><td style="vertical-align: top; padding: 2px 8px 2px 0; font-weight: 600;">Seller:</td><td style="vertical-align: top; padding: 2px 0;">{{seller.name}}</td></tr>
    <tr><td style="vertical-align: top; padding: 2px 8px 2px 0; font-weight: 600;">Purchaser:</td><td style="vertical-align: top; padding: 2px 0;">{{buyer.legal_name}}</td></tr>
  </table>
  <p><strong>Share transaction — sale / purchase of the entire issued share capital of Limited Co. No. {{transaction.company_number}} ("Company")</strong></p>
  <p>Purchase Price to be adjusted post-completion in accordance with the Net Asset Value (NAV) on the basis that tangible and intangible fixed assets and stock fixed at nil (ignored). (Nb. On completion there is to be sufficient stock for 2 days average use per surgery, any excess stock may be transferred out if the seller wishes).</p>
  <p><strong>Purchase Price: {{transaction.price}}</strong></p>
  <p>Apportionment as follows:</p>
  <p>Goodwill, Equipment Fixtures &amp; Fittings: {{transaction.price}}</p>
  <p><strong>Leasehold:</strong> It is understood that the landlord has given assurances that a new {{transaction.lease_term}} lease will be granted to an incoming buyer.</p>
  <p>It has been agreed between the seller and purchaser that the landlord solicitor fees are to be shared equally between both parties.</p>
  <p><strong>EPC:</strong> an Energy Performance Certificate will be made available during the legal stages.</p>
  <p><strong>Purchaser's Deposit</strong> — the seller's agent hold a deposit of;</p>
  <p>{{transaction.deposit_percent}}% of the agreed purchase price being {{transaction.deposit_amount}} and the purchaser agrees to arrange their funding via FTA Finance and completion of the necessary application information within 10 days; alongside permission for Frank Taylor and Associates to discuss their funding application directly with FTA Finance and their lending bank.</p>
  <p>The Purchaser's Deposit is being held as a commitment to the above purchase and set out below are the terms and conditions on which the purchaser's deposit will be held:</p>
  <p>If the purchaser does not proceed then the deposit will only be returned to the purchaser if:</p>
  <ul style="padding-left: 20px;">
    <li style="margin-bottom: 10px;">During the purchase process, it becomes clear that, for whatever reason, the seller's title to the practice is such that no prudent purchaser would proceed with the proposed purchase at the agreed price or that no prudent lender would lend against the security of the practice at the agreed price;</li>
    <li style="margin-bottom: 10px;">Seller withdraws from the proposed transaction other than because of unreasonable delays in proceeding with the transaction on the purchaser's part;</li>
    <li style="margin-bottom: 10px;">A material representation made in writing by the seller about the practice proves, on further examination, to be untrue; or</li>
    <li style="margin-bottom: 10px;">The purchaser withdraws from the proposed transaction because of unreasonable delays in proceeding with the transaction on the part of the seller or commercial issues arise after basic terms have been agreed which are directly linked to the practice and which would objectively cause a prudent purchaser to withdraw from the proposed purchase, e.g. re issue of the NHS contract on the existing terms and conditions;</li>
    <li style="margin-bottom: 10px;">The purchaser has provided written confirmation of finance not being secured within six weeks of signing the holding deposit letter and the Purchaser is unable to raise the finance required as assessed by the FT&amp;A Finance in conjunction with the specialist Dental Units of our Panel of Banks;</li>
    <li style="margin-bottom: 10px;">After these Heads of Agreement have been issued, the purchaser's situation changes and these changes have not been influenced by the seller then as a minimum Frank Taylor &amp; Associates will retain £1,000 + VAT as a contribution towards their costs plus the legal fees incurred by the seller up to that point;</li>
    <li style="margin-bottom: 10px;">The purchaser will have maintained regular contact with Frank Taylor &amp; Associates and will not have been out of touch for a period of more than two weeks, unless by prior agreement;</li>
    <li style="margin-bottom: 10px;">Where a premium applies, this element of the transaction is non-negotiable;</li>
    <li style="margin-bottom: 10px;">Assuming that the transaction proceeds to completion, the holding deposit will be used as part of the purchase price.</li>
  </ul>
  <p>We also reserve the right to re-market the practice and retain the purchaser's deposit if: without valid reason, this transaction does not exchange contracts within six months of signing the holding deposit letter; or, if the purchaser has been removed from the GDC register.</p>
  <p>We will retain the purchaser's deposit if the transaction does not proceed (other than as set out above) in order to meet our and the seller's abortive expenses relating to the transaction. In the unlikely event that it proves necessary to retain the purchaser's deposit, the decision to do so will be made at our absolute discretion.</p>
  <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
    <tr>
      <td style="vertical-align: top; width: 50%; padding-right: 12px;"><strong>Seller's Solicitor</strong><br>{{seller.solicitor}}</td>
      <td style="vertical-align: top; width: 50%; padding-left: 12px;"><strong>Purchaser's Solicitor</strong><br>{{buyer.solicitor}}</td>
    </tr>
  </table>
  <p style="margin-top: 28px;">Acknowledged receipt of and agreement to the terms as specified above by</p>
  <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
    <tr>
      <td style="vertical-align: top; width: 50%; padding-right: 12px;">
        <p style="margin: 0 0 8px;"><strong>{{seller.name}}</strong></p>
        <div style="margin-top: 12px;">{{signature:seller}}</div>
      </td>
      <td style="vertical-align: top; width: 50%; padding-left: 12px;">
        <p style="margin: 0 0 8px;"><strong>{{buyer.name}}</strong></p>
        <div style="margin-top: 12px;">{{signature:buyer}}</div>
      </td>
    </tr>
  </table>
</div>
  $body$
where key = 'heads_of_agreement';
