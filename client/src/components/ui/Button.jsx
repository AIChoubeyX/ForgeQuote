export function Button({ children, className = '', ...props }) {
  return <button className={`button button-primary ${className}`} {...props}>{children}</button>;
}
