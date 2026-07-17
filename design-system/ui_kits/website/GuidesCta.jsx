/* global React, SectionHead, Carousel */

const GUIDES = [
  { img: 'thumb1-selling-tips.png', tag: 'Selling Tips', title: '10 Top Tips to Selling a Dental Practice' },
  { img: 'thumb2-buying-tips.png', tag: 'Buying Tips', title: '10 Top Tips for Buying a Dental Practice' },
  { img: 'thumb3-the-valuation-process.png', tag: 'Selling Tips', title: '10 Top Tips to Selling a Dental Practice' },
  { img: 'thumb1-selling-tips.png', tag: 'Buying Tips', title: 'Understanding practice valuations' },
];

function GuideCard({ g }) {
  return (
    <article className="guide-card">
      <div className="guide-img">
        <img src={'../../assets/' + g.img} alt="" />
        <span className="badge badge-tip guide-tag">{g.tag}</span>
      </div>
      <div className="guide-body">
        <h3>{g.title}</h3>
        <p>Selling a dental practice is a big decision – probably one of the most important that you will make.</p>
        <a className="link-gold" href="#">Claim Your FREE Guide →</a>
      </div>
    </article>
  );
}

function GuidesSection() {
  return (
    <section className="band">
      <div className="container section-flush">
        <SectionHead title="Guides" sub="Claim your FREE guides here" action="View All Guides" />
        <Carousel items={GUIDES} perView={3} render={(g) => <GuideCard g={g} />} />
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="band">
      <div className="container">
        <div className="cta-banner">
          <div className="cta-text">
            <h2>Ready to take the next step?</h2>
            <p>Get expert guidance on your practice sale or purchase.</p>
          </div>
          <div className="cta-actions">
            <a className="btn btn-outline-on-gold" href="#">Book Your Free Valuation <span className="arw-ink">→</span></a>
            <a className="btn btn-outline-on-gold" href="#">WhatsApp Us <span className="arw-ink">→</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}
window.GuidesSection = GuidesSection;
window.CtaBanner = CtaBanner;
