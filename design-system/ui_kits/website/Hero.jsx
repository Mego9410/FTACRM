/* global React */

function Hero() {
  const [mode, setMode] = React.useState('buy');
  const [where, setWhere] = React.useState('');
  return (
    <section className="hero container">
      <div className="hero-frame">
        <img className="hero-bg" src="../../assets/banner-bg.png" alt="" />
        <div className="hero-scrim" />
        <div className="hero-content">
          <h1 className="display hero-title">
            Helping you buy or sell your dental practice with confidence and maximum value
          </h1>
          <p className="hero-sub">
            A trusted, confidential partner for buying and selling dental practices, at the right
            time and the right price.
          </p>
        </div>
        <div className="hero-search search-panel">
          <div className="search-label">Where are you looking?</div>
          <div className="search-row">
            <input
              className="field"
              placeholder="e.g. London, N1"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
            />
            <button
              className={'btn ' + (mode === 'buy' ? 'btn-primary' : 'btn-soft')}
              onClick={() => setMode('buy')}
            >Buy</button>
            <button
              className={'btn ' + (mode === 'sell' ? 'btn-dark' : 'btn-soft')}
              onClick={() => setMode('sell')}
            >Sell</button>
          </div>
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;
