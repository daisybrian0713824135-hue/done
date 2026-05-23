import { useEffect } from 'react';

export default function IntersectObserver() {
  useEffect(() => {
    const observer = new window.IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('intersected');
          }
        }
      },
      { threshold: 0.1 }
    );
    const elements = document.querySelectorAll('[data-intersect]');
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return null;
}
