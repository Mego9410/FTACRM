/* global React */

const FOOTER_COLS = [
  { head: 'Buy', links: ['Buy a Practice', 'Articles', 'Guides'] },
  { head: 'Sell', links: ['Sell a Practice', 'Valuation', 'Finance'] },
  { head: 'Community', links: ['The Principals Club', 'The Associates Club'] },
  { head: 'Events', links: ['Page Title Link', 'Page Title Link', 'Page Title Link'] },
  { head: 'Contact', links: ['Contact Us', 'Book a Call', '0330 088 1156'] },
  { head: 'Legal', links: ['Privacy Policy', 'Terms and Conditions', 'Cookie Settings'] },
];

const SOCIAL = ['instagram', 'facebook', 'x', 'linkedin', 'youtube', 'whatsapp'];

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="footer-plate"><img src="../../assets/logo.png" alt="Frank Taylor & Associates" /></div>
          <p>The UK's leading independent dental practice sales agency. Guiding practice owners with integrity since 1988.</p>
          <div className="socials">
            {SOCIAL.map((s) => (
              <a className="social" href="#" key={s} aria-label={s}>
                <img src={`../../assets/icons/${s}-white-yellow-circle-icon.svg`} alt="" />
              </a>
            ))}
          </div>
        </div>
        <div className="footer-cols">
          {FOOTER_COLS.map((c) => (
            <div className="footer-col" key={c.head}>
              <div className="footer-head">{c.head}</div>
              {c.links.map((l, i) => <a className="footer-link" href="#" key={i}>{l}</a>)}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
