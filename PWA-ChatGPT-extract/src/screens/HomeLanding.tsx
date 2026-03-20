import './start.css';

export function Start() {
  return (
    <main className="start">
      <header className="start__header">
        <img className="start__logo" src="/brand/Logo-ohne-Schrift.png" alt="Stillberatung" />
      </header>

      <section className="start__hero" aria-label="Babybild">
        <img className="start__baby" src="/brand/baby-fade.png" alt="" />
      </section>

      <nav className="start__nav" aria-label="Themen">
        <button
          className="start__btn start__btn--pregnancy"
          aria-label="In der Schwangerschaft"
        />
        <button className="start__btn start__btn--birth" aria-label="Bei der Geburt" />
        <button
          className="start__btn start__btn--breastfeeding"
          aria-label="Stillen"
        />
      </nav>
    </main>
  );
}

export default Start;
