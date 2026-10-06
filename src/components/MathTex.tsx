import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTexProps {
  tex: string;
  display?: boolean;
  className?: string;
}

/**
 * Renders a LaTeX string with KaTeX.
 * display=true  -> block-level (display mode), centered like GB/T equation style
 * display=false -> inline math
 */
export default function MathTex({ tex, display = false, className = '' }: MathTexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        trust: true,
      });
    } catch {
      return null;
    }
  }, [tex, display]);

  if (html === null) {
    return <code className={className}>{tex}</code>;
  }

  if (display) {
    return (
      <div
        className={`my-2 overflow-x-auto text-center ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
