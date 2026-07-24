-- Two more system document templates: the Holding Deposit letter and the Heads
-- of Agreement. Both are buyer/transaction-side documents (the LOA in 0031 is
-- seller-side). Variable data is expressed with {{merge.fields}} resolved at
-- generation; staff confirm/complete the transaction fields before sending.
--
-- Signing: the built-in signer is single-party, so the buyer/purchaser e-signs
-- via the {{signature}} slot. The Heads of Agreement's second (seller) party is a
-- printed signature line, to be countersigned off-system until two-party signing
-- is added.

-- ── Holding Deposit ───────────────────────────────────────────────────
insert into public.document_templates (key, name, description, body_html, sort_order)
values (
  'holding_deposit',
  'Holding Deposit',
  'Confirms the seller has accepted the buyer offer and secures the deal with a holding deposit. Signed by the buyer.',
  $body$
<div style="font-family: 'Hanken Grotesk', Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #1a1a1a; line-height: 1.65; font-size: 14px;">
  <p style="margin: 0 0 18px;"><strong>Private and Confidential</strong><br>{{buyer.name}}<br>{{buyer.address}}</p>
  <p style="text-align: right; margin: 0 0 18px;">{{date.today}}</p>
  <p>Dear {{buyer.greeting|Sir/Madam}},</p>
  <p>Further to our telephone conversation, I am delighted to confirm {{seller.name}} has formally accepted your offer to purchase {{practice.name}}, {{practice.address_inline}}.</p>
  <p>The purchase price of {{transaction.price}} is for the goodwill, equipment, fixtures, and fittings. Stock is not included in the purchase price and we leave it with you to deal directly with the seller. Stock is taken to mean in date and unopened and needs to be assessed closer to the point of completion.</p>
  <p>Your offer has been accepted on the basis you have confirmed in writing that you have sufficient funds to cover the cost of the purchase.</p>
  <p>If the lease is being assigned or a new lease created (by a third party landlord), we will need confirmation of who is to cover the landlord solicitor fees. Often this cost is shared equally by both parties, seller and purchaser.</p>
  <p>We want to use our experience to work with you towards a completion which will be as stress free as possible and suggest you take some time to go through this letter and the attached appendices.</p>
  <p>To secure your offer you MUST sign and return the attached copy of this letter. The holding deposit MUST BE PAID within 48 hours by direct bank transfer to Frank Taylor &amp; Associates Deposits account sort code 82-66-13, account number 70024051 and please quote your name as a reference. By making your payment you accept the terms and conditions of this letter. The value of the required deposit is:</p>
  <p>{{transaction.deposit_percent}}% of the agreed purchase price being {{transaction.deposit_amount}} and you are also required to provide Frank Taylor &amp; Associates consent to liaise directly with your nominated bank manager and provide their email address and a direct line telephone number (either office or mobile) to discuss your funding application, again within 14 days of signing this Holding Deposit letter. Failure to do so could lead to your deposit being forfeited.</p>
  <p>This money is held in a separate bank account called the Deposits Account and the money remains in that account until the matter completes or (for reasons which are stated in Appendix 1) is returned. Once we have received the signed letter and funds, the practice is then taken off the market.</p>
  <p>You now need to instruct a solicitor within 2 working days to act on your behalf and we strongly recommend you consider using a lawyer who is a dental specialist. We have witnessed that when a non-dental specialist lawyer has been involved, the results can be catastrophic, in several cases resulting in omissions in contracts which has left the buyer vulnerable in the future plus long drawn out completions often costing far more in legal fees. We are happy to provide you with details of dental specialist lawyers that we recommend. Once solicitors have been instructed we continue to work for you by introducing our Sales Progression team, we work with both sets of law firms and monitor the progress of the purchase and try to assist wherever possible to ensure your transaction completes.</p>
  <p>By signing this letter you are giving Frank Taylor &amp; Associates authority to discuss this transaction with any professional advisors involved within the matter.</p>
  <p>If this is your first purchase of a dental practice it may impact on many areas of your life. One of our experts at FTA Finance will contact you to take you through all the financial aspects of this journey from start to finish. Our aim is to provide you with all the hassle free information and guidance by sourcing the best deals in the market place from funding this purchase to practice insurance, wills, trusts and personal insurances such as life and critical illness cover which will be required by the bank to support your loan. Even if this isn't your first practice purchase, we find many dentists have been too busy being dentists and business owners to carry out a regular financial review and frequently find this service introduces benefits that have been previously overlooked.</p>
  <p>We know there is a lot of information in this letter but there are many aspects to a purchase of a dental practice and we believe we are the best people to help you achieve this dream. So remember, you can call us over any concerns or issues you may have regarding the purchase and we will always respond quickly, efficiently, and work with you.</p>
  <p>We know we can never guarantee the outcome, but we can guarantee our service.</p>
  <p>We look forward to working with you.</p>
  <p style="margin-top: 24px;">Yours sincerely</p>
  <p style="margin: 24px 0 0;">{{fta.signatory}}<br>{{fta.signatory_role|Client Manager}}<br>Frank Taylor &amp; Associates</p>
  <p style="margin-top: 28px;">Acknowledged receipt of and agreement to the terms of the retainer as specified above by</p>
  <p style="margin: 0 0 6px;"><strong>{{buyer.name}}</strong></p>
  <div style="margin-top: 12px;">{{signature}}</div>

  <div style="page-break-before: always; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 24px;">
    <h3 style="margin: 0 0 12px;">Appendix — Terms and Conditions — Holding Deposit</h3>
    <p>If the practice purchase does not proceed then the deposit will only be returned to you if:</p>
    <ul style="padding-left: 20px;">
      <li style="margin-bottom: 10px;">During the purchase process, it becomes clear that, for whatever reason, your seller's title to the practice is such that no prudent purchaser would proceed with the proposed purchase at the agreed price or that no prudent lender would lend against the security of the practice at the agreed price;</li>
      <li style="margin-bottom: 10px;">Your seller withdraws from the proposed transaction other than because of unreasonable delays in proceeding with the transaction on your part;</li>
      <li style="margin-bottom: 10px;">A material representation made in writing by the seller about the practice proves, on further examination, to be untrue;</li>
      <li style="margin-bottom: 10px;">You withdraw from the proposed transaction because of unreasonable delays in proceeding with the transaction on the part of your seller or commercial issues arise after basic terms have been agreed which are directly linked to the practice and which would objectively cause a prudent purchaser to withdraw from the proposed purchase, e.g. re issue of the NHS contract on the existing terms and conditions;</li>
      <li style="margin-bottom: 10px;">You have provided written confirmation of finance not being secured within six weeks of signing this letter and you are unable to raise the finance required as assessed by FTA Finance in conjunction with the specialist Dental Units of our Panel of Banks;</li>
      <li style="margin-bottom: 10px;">After the Heads of Agreement have been issued, the purchaser's situation changes and these changes have not been influenced by the Seller then as a minimum Frank Taylor &amp; Associates will retain £1,000 + VAT as a contribution towards their costs plus the legal fees incurred by the Seller up to that point;</li>
      <li style="margin-bottom: 10px;">You have maintained regular contact with Frank Taylor &amp; Associates and not be out of touch for a period of more than two weeks, unless by prior agreement. It is critical that momentum is maintained, and you continue to show the commitment and dedication to the practice purchase;</li>
      <li style="margin-bottom: 10px;">Where a premium applies, this element of the transaction is non-negotiable;</li>
      <li style="margin-bottom: 10px;">Assuming that the transaction proceeds to completion, the holding deposit will be used as part of the purchase price.</li>
    </ul>
    <p>We will retain the holding deposit if the transaction does not proceed (other than as set out above or you are removed from the GDC register) in order to meet our and the seller's abortive expenses relating to the transaction. In the unlikely event that it proves necessary to retain your holding deposit, the decision to do so will be made at our absolute discretion. However, I must assure you that we want your purchase to proceed smoothly and as such the payment of a deposit is your commitment to proceed and upon completion the holding deposit will be used as part of the purchase price.</p>
  </div>
</div>
  $body$,
  1
)
on conflict (key) do nothing;

-- ── Heads of Agreement ────────────────────────────────────────────────
insert into public.document_templates (key, name, description, body_html, sort_order)
values (
  'heads_of_agreement',
  'Heads of Agreement',
  'Sets out the agreed terms of the sale between seller and purchaser, subject to contract. The buyer signs online; the seller signature line is countersigned off-system.',
  $body$
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
        <p style="margin: 24px 0 4px;">Signature: ..............................................</p>
        <p style="margin: 0;">Date: .........................................................</p>
      </td>
      <td style="vertical-align: top; width: 50%; padding-left: 12px;">
        <p style="margin: 0 0 8px;"><strong>{{buyer.name}}</strong></p>
        <div style="margin-top: 12px;">{{signature}}</div>
      </td>
    </tr>
  </table>
</div>
  $body$,
  2
)
on conflict (key) do nothing;
