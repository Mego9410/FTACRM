/* global React, SectionHead */

const ARTICLES = [
  { title: 'Why sellers who prepare now will achieve the strongest outcomes', date: '19 January 2026', excerpt: 'Many owners who are thinking about selling in 2026 have already begun exploring their options…' },
  { title: 'Prepare your ideal exit for 2026', date: '15 December 2025', excerpt: 'As the year draws to a close, many practice owners take a moment to look back at their progress and consider…' },
  { title: 'Understanding owner fatigue™: A growing issue in dentistry', date: '09 December 2025', excerpt: 'Running a dental practice has never been more demanding, and for many principals the weight of responsibility…' },
  { title: 'Getting your finances ready before a sale', date: '28 November 2025', excerpt: 'Clean, well-presented accounts give buyers confidence and help your valuation hold up under scrutiny…' },
];

function ArticleCard({ a }) {
  return (
    <article className="article-card">
      <h3>{a.title}</h3>
      <div className="kicker-date">{a.date}</div>
      <p>{a.excerpt}</p>
      <a className="link-gold" href="#">Read Article →</a>
    </article>
  );
}

function Carousel({ items, render, perView = 3 }) {
  const [i, setI] = React.useState(0);
  const max = Math.max(0, items.length - perView);
  const prev = () => setI((v) => Math.max(0, v - 1));
  const next = () => setI((v) => Math.min(max, v + 1));
  return (
    <div className="carousel">
      <button className="car-arw" onClick={prev} disabled={i === 0} aria-label="Previous">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M13 8H4M7 4L3 8l4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div className="car-viewport">
        <div className="car-track" style={{ transform: `translateX(calc(-${i} * (100% / ${perView} ) - ${i} * 24px / 1))` }}>
          {items.map((it, idx) => (
            <div className="car-cell" style={{ flex: `0 0 calc((100% - ${(perView - 1) * 24}px) / ${perView})` }} key={idx}>
              {render(it, idx)}
            </div>
          ))}
        </div>
      </div>
      <button className="car-arw" onClick={next} disabled={i === max} aria-label="Next">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 8h9M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

function ArticlesSection() {
  return (
    <section className="section container">
      <SectionHead title="Latest Articles" sub="Fresh insights and practical advice to help you navigate buying and selling." action="View All Articles" />
      <Carousel items={ARTICLES} perView={3} render={(a) => <ArticleCard a={a} />} />
    </section>
  );
}
window.Carousel = Carousel;
window.ArticlesSection = ArticlesSection;
