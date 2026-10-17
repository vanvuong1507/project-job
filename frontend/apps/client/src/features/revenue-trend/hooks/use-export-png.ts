import { useCallback, useState, type RefObject } from 'react';

/** Elements marked with this attribute are left out of the exported image (e.g. the export button). */
export const EXPORT_IGNORE_ATTRIBUTE = 'data-export-ignore';

/**
 * Renders a DOM node to PNG and downloads it. `html-to-image` is imported on demand,
 * so it never weighs on the initial bundle.
 */
export function useExportPng<T extends HTMLElement>(ref: RefObject<T | null>, fileName: string) {
  const [isExporting, setIsExporting] = useState(false);
  const [failed, setFailed] = useState(false);

  const exportPng = useCallback(async () => {
    const node = ref.current;
    if (!node) return;

    setIsExporting(true);
    setFailed(false);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        // Resolve the themed surface colour so the PNG never has a transparent background.
        backgroundColor: getComputedStyle(node).backgroundColor,
        filter: (element) =>
          !(element instanceof HTMLElement && element.hasAttribute(EXPORT_IGNORE_ATTRIBUTE)),
      });
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (cause) {
      console.error(cause);
      setFailed(true);
    } finally {
      setIsExporting(false);
    }
  }, [ref, fileName]);

  return { exportPng, isExporting, failed };
}
