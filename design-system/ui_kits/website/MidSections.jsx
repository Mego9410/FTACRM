/* global React */

function PromoCards() {
  const promos = [
    { icon: 'icon1-circle-white-yellow-value-your-practice.svg', title: 'Value your practice', text: 'Find out how much your practice is worth from an expert.', cta: 'Book Your Free Valuation →' },
    { icon: 'icon2-circle-white-yellow-become-a-member.svg', title: 'Become a member', text: 'Receive practice details up to 5 days before launch.', cta: 'Get Early Access →' },
  ];
  return (
    <section className="section container promo-row">
      {promos.map((p) => (
        <div className="promo-card" key={p.title}>
          <img className="promo-ic" src={'../../assets/icons/' + p.icon} alt="" />
          <div className="promo-body">
            <h3 className="promo-title">{p.title}</h3>
            <p>{p.text}</p>
            <a className="link-gold" href="#">{p.cta}</a>
          </div>
        </div>
      ))}
    </section>
  );
}

const FEATURES = [
  { icon: 'icon1-circle-yellow-white-your-journey-with-frank-taylor.svg', title: 'Your journey with Frank Taylor & Associates', text: 'Objective market valuations, free from buyer influence or corporate agendas.' },
  { icon: 'icon2-circle-yellow-white-vetted-buyers.svg', title: '5,000+ vetted buyers', text: 'Introductions only to buyers who are serious, funded, and ready.' },
  { icon: 'icon3-circle-yellow-white-seller-only-representation.svg', title: 'Seller-only representation', text: 'We act exclusively for you, no buyer fees, no conflicts, no divided loyalty.' },
  { icon: 'icon4-circle-yellow-white-guided-from-first-step.svg', title: 'Guided from first step to final signature', text: 'A structured, calm process that removes uncertainty at every stage.' },
];

function JourneySection() {
  return (
    <section className="band">
      <div className="container journey">
        <div className="journey-head">
          <h2>Your journey with Frank Taylor &amp; Associates</h2>
          <p className="sec-sub center">Over thirty years of experience guiding dental practice owners through successful sales.</p>
        </div>
        <div className="grid-4">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <img className="feat-ic" src={'../../assets/icons/' + f.icon} alt="" />
              <h4>{f.title}</h4>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
        <div className="center-btn">
          <a className="btn btn-outline" href="#">Start Your Journey Today
            <svg className="arw" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="section container about">
      <div className="about-img"><img src="../../assets/about-thumb.png" alt="London skyline" /></div>
      <div className="about-body">
        <h2>About Frank Taylor &amp; Associates</h2>
        <p>Frank Taylor &amp; Associates specialises in practice valuations, sales, purchases and business improvement consultancy services for dental professionals in England and Wales. The company has been involved in the sale and valuation of thousands of dental practices nationwide, and has a depth of experience that is unrivalled in the UK.</p>
        <p>Confidentiality and professionalism are critical when discussing your practice or plans for the future – you can be assured of this when you deal with Frank Taylor &amp; Associates.</p>
        <div className="about-actions">
          <a className="btn btn-outline" href="#">Explore <span className="arw-gold">→</span></a>
          <a className="btn btn-outline" href="#">Call Us <span className="arw-gold">→</span></a>
        </div>
      </div>
    </section>
  );
}
window.PromoCards = PromoCards;
window.JourneySection = JourneySection;
window.AboutSection = AboutSection;
