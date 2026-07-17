/* global React */

function Nav() {
  const [open, setOpen] = React.useState(null);
  const links = [
    { label: 'Buy' }, { label: 'Sell' },
    { label: 'Community', caret: true }, { label: 'Events', caret: true },
    { label: 'Contact' },
  ];
  return (
    <header className="nav">
      <div className="nav-inner container">
        <a className="nav-logo" href="#"><img src="../../assets/logo.png" alt="Frank Taylor & Associates" /></a>
        <nav className="nav-links">
          {links.map((l) => (
            <a key={l.label} className="nav-link" href="#">
              {l.label}
              {l.caret && (
                <img className="caret" src="../../assets/icons/down-yellow-plain-arrow.svg" alt="" />
              )}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <a className="wa-chip" href="#" aria-label="WhatsApp">
            <img src="../../assets/icons/whatsapp-yellow-white-circle-icon.svg" alt="" />
          </a>
          <a className="btn btn-outline-ink" href="#">
            Book Valuation
            <svg className="arw" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </div>
    </header>
  );
}
window.Nav = Nav;
