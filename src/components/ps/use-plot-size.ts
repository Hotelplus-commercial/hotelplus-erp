import { useEffect, useRef, useState } from 'react';

/** Measure the SVG's actual CSS box; never stretch a fixed coordinate system. */
export function usePlotSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 300 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      setSize({ width, height });
    };
    measure();
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(measure, 100);
    });
    observer.observe(node);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, []);
  return { ref, ...size };
}