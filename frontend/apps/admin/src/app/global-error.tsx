'use client';

/**
 * Last-resort boundary: replaces the root layout when it fails, so no app CSS, fonts, theme or i18n
 * are available — plain HTML with inline styles, bilingual copy, and `retry()` (re-fetches server data).
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f8f7f2',
          color: '#2a2a2a',
        }}
      >
        <main role="alert" style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 16px', color: '#6b6b6b' }}>
            Đã có lỗi xảy ra. Vui lòng thử lại.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 0,
              background: '#2b2b2b',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Retry · Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
