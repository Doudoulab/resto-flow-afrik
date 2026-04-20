/**
 * Shared print styles for tickets (80mm thermal printer format).
 * Hides everything except .ticket-print on print.
 */
export const PrintStyles = () => (
  <style>{`
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body * { visibility: hidden; }
      .ticket-print, .ticket-print * { visibility: visible; }
      .ticket-print {
        position: absolute;
        left: 0;
        top: 0;
        width: 80mm;
        padding: 4mm;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        color: #000;
        background: #fff;
      }
      .no-print { display: none !important; }
    }
  `}</style>
);