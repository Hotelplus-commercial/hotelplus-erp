import { useEffect, useState } from 'react';

/** Measure the SVG's actual CSS box; never stretch a fixed coordinate system. */
export function usePlotSize() {
  const [node, ref] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 300 });
  useEffect(() => {
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
  }, [node]);
  return { ref, ...size };
}