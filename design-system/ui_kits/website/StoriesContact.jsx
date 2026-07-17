/* global React */

const STORIES = [
  { img: 'thumb3-the-valuation-process.png', label: 'The valuation process' },
  { img: 'thumb1-my-sale-journey.png', label: 'My sale journey' },
  { img: 'thumb2-why-i-chose-fta.png', label: 'Why I chose FTA' },
  { img: 'thumb1-selling-tips.png', label: 'Life after selling' },
];

const QUOTES = [
  { q: 'FTA guided me calmly from valuation to completion. I felt supported and informed at every step.', who: 'Dr John Doe' },
  { q: 'The valuation was fair, the buyers were serious, and the final outcome changed my life.', who: 'Dr John Doe' },
  { q: 'Confidential, professional, and completely seller-focused from day one.', who: 'Dr John Doe' },
];

function Stars() {
  return (
    <span className="stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <img key={i} src="../../assets/icons/star-yellow-plain-icon.svg" alt="" />
      ))}
    </span>
  );
}

function StoriesSection() {
  return (
    <section className="section container stories">
      <div className="journey-head">
        <h2>Real outcomes from real sellers</h2>
        <p className="sec-sub center">See how real practice owners achieved successful sales with expert support, fair valuations, and a smooth, confidential process from start to finish.</p>
      </div>
      <div className="watch-label">Watch their stories</div>
      <div className="story-row">
        {STORIES.map((s, i) => (
          <button className="story-tile" key={i}>
            <img src={'../../assets/' + s.img} alt="" />
            <span className="story-scrim" />
            <span className="badge badge-tip story-label">{s.label}</span>
            <span className="play"><img src="../../assets/icons/play-white-transparent-white-circle-icon.svg" alt="Play" /></span>
          </button>
        ))}
      </div>

      <div className="success-label">Success stories</div>
      <div className="grid-3">
        {QUOTES.map((qt, i) => (
          <div className="quote-card" key={i}>
            <div className="q">“{qt.q}”</div>
            <div className="who-row">
              <div className="who">{qt.who}</div>
              <Stars />
            </div>
          </div>
        ))}
      </div>
      <div className="rating">
        <strong>4.8</strong>
        <img src="../../assets/icons/star-yellow-plain-icon.svg" alt="" />
        <span>119 Google reviews</span>
      </div>
    </section>
  );
}

const CONTACTS = [
  { icon: 'calendar', title: 'Book Your Valuation', text: 'Schedule a confidential consultation.' },
  { icon: 'whatsapp', title: 'WhatsApp Us', text: 'Message our team directly.' },
  { icon: 'video', title: 'Book a 1-1', text: 'Choose a time that works for you.' },
  { icon: 'phone', title: 'Call Now', text: 'Speak to our team today.' },
];

function ContactIcon({ name }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--gold)', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'whatsapp') return <img src="../../assets/icons/whatsapp-yellow-white-circle-icon.svg" width="40" height="40" alt="" />;
  if (name === 'calendar') return <svg {...common}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>;
  if (name === 'video') return <svg {...common}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></svg>;
  return <svg {...common}><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
}

function ContactSection() {
  return (
    <section className="section container contact">
      <div className="journey-head">
        <h2>Do you want to explore selling your practice without committing to anything or alerting anyone?</h2>
        <p className="sec-sub center">A confidential valuation allows you to understand your options without pressure. No staff, no patients, and no buyers need to know. You gain clarity, reassurance, and the confidence to decide what feels right, entirely on your terms.</p>
      </div>
      <div className="contact-grid">
        {CONTACTS.map((c) => (
          <a className="contact-card" href="#" key={c.title}>
            <span className={'contact-disc' + (c.icon === 'whatsapp' ? ' bare' : '')}><ContactIcon name={c.icon} /></span>
            <span className="contact-body">
              <span className="contact-title">{c.title}</span>
              <span className="contact-text">{c.text}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
window.StoriesSection = StoriesSection;
window.ContactSection = ContactSection;
