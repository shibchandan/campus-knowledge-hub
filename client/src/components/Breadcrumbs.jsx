import { Link } from "react-router-dom";

export function Breadcrumbs({ items }) {
  if (!items || items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs-container">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="breadcrumb-item" aria-current={isLast ? "page" : undefined}>
              {isLast ? (
                <span className="breadcrumb-current" title={item.label}>{item.label}</span>
              ) : (
                <>
                  <Link to={item.href} className="breadcrumb-link" title={item.label}>
                    {item.label}
                  </Link>
                  <span className="breadcrumb-separator" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
