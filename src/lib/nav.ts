/**
 * Navigation from outside React (the data actions), the way server actions used
 * `redirect()`. The router registers itself on start.
 */
type Navigate = (to: string, opts?: { replace?: boolean }) => void;

let navigate: Navigate = (to) => window.location.assign(to);

export function setNavigate(fn: Navigate) {
  navigate = fn;
}

export function go(to: string, opts?: { replace?: boolean }) {
  navigate(to, opts);
}
