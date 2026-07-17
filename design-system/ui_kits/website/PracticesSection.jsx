/* global React */

function SectionHead({ title, sub, action }) {
  return (
    <div className="sec-head">
      <div>
        <h2>{title}</h2>
        {sub && <p className="sec-sub">{sub}</p>}
      </div>
      {action && (
        <a className="btn btn-outline" href="#">
          {action}
          <svg className="arw" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      )}
    </div>
  );
}

const PRACTICES = [
  { loc: 'Central London', ref: '14-01-3449', surgeries: 'Four Surgeries', tenure: 'Leasehold', type: 'NHS', badge: 'badge-nhs', fee: '£1,988,329', asking: '£1,371,947' },
  { loc: 'Manchester', ref: '14-02-2187', surgeries: 'Three Surgeries', tenure: 'Freehold', type: 'Mixed', badge: 'badge-mixed', fee: '£1,245,600', asking: '£895,000' },
  { loc: 'Birmingham', ref: '14-03-1856', surgeries: 'Five Surgeries', tenure: 'Leasehold', type: 'Private', badge: 'badge-private', fee: '£2,156,780', asking: '£1,650,000' },
];

function PracticeCard({ p }) {
  return (
    <article className="practice-card">
      <div className="pc-top">
        <div className="loc"><img src="../../assets/icons/pin-yellow-plain-icon.svg" alt="" />{p.loc}</div>
        <div className="ref">Ref. {p.ref}</div>
      </div>
      <div className="specs">
        <div>{p.surgeries}</div>
        <div className="spec-ic"><img src="../../assets/icons/leasehold-black-plain-icon.svg" alt="" />{p.tenure}</div>
        <div><span className={'badge ' + p.badge}>{p.type}</span></div>
        <div className="avail"><img src="../../assets/icons/available-green-plain-icon.svg" alt="" />Available</div>
      </div>
      <div className="divide" />
      <div className="price-row"><span className="k">Fee income:</span><span className="v">{p.fee}</span></div>
      <div className="price-row asking"><span className="k">Asking price:</span><span className="v">{p.asking}</span></div>
      <a className="link-gold" href="#">View Details →</a>
    </article>
  );
}

function PracticesSection() {
  return (
    <section className="section container">
      <SectionHead title="Latest practices for sale" sub="View our most recently launched dental practices." action="View All Practices" />
      <div className="grid-3">
        {PRACTICES.map((p) => <PracticeCard key={p.ref} p={p} />)}
      </div>
    </section>
  );
}
window.SectionHead = SectionHead;
window.PracticesSection = PracticesSection;
