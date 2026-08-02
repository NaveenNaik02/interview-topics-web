export default function AuthSidebar() {
  return (
    <aside className="login-side">
      <div className="login-side-top">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-title">Prep Tracker</div>
            <div className="brand-sub">Build your own prep</div>
          </div>
        </div>
      </div>
      <p className="login-quote">
        &quot;Create your own topics, add the questions you actually want to
        practice, and track progress your way.&quot;
      </p>
      <a className="login-guide-link" href="#">
        <span className="login-guide-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 22z" />
            <path d="M4 5.5v13A2.5 2.5 0 0 0 6.5 21H18" />
          </svg>
        </span>
        <span className="login-guide-text">
          <strong>See what Prep Tracker can do</strong>
          <span>Full feature guide →</span>
        </span>
      </a>
    </aside>
  );
}
