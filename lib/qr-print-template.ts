/**
 * Générateur de template d'impression QR personnalisé
 * Design: Orange sur fond blanc, 8 QR par A4, carrés, scanables
 */

export interface QRItem {
  code: string
  label?: string
}

export function generateQRPrintHTML(
  items: QRItem[],
  appUrl: string,
  batchName?: string
): string {
  // Grouper les QR codes par 8 (8 par page A4 - 4x2)
  const pages: QRItem[][] = [];
  for (let i = 0; i < items.length; i += 8) {
    pages.push(items.slice(i, i + 8));
  }

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Codes Personnalisés ${batchName ? `— ${batchName}` : ''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 10mm;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding: 0;
    }

    .page {
      width: 210mm;
      height: 297mm;
      background: white;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 8mm;
      padding: 10mm;
      page-break-after: always;
      margin-bottom: 20px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    .qr-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      background: white;
      border: 1px solid #eee;
      padding: 12px;
      page-break-inside: avoid;
      overflow: visible;
      aspect-ratio: 1;
    }

    /* Marques de découpe - croix aux 4 coins */
    .qr-card::before {
      content: '';
      position: absolute;
      width: 8px;
      height: 1px;
      background: #FF8C00;
      top: -4px;
      left: -4px;
    }

    .qr-card::after {
      content: '';
      position: absolute;
      width: 1px;
      height: 8px;
      background: #FF8C00;
      top: -4px;
      left: -4px;
    }

    /* Titre TableQR */
    .header {
      font-family: 'Great Vibes', cursive;
      font-size: 16px;
      color: #FF8C00;
      font-weight: 600;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
      font-style: italic;
    }

    /* Badge numéro - JUSTE AU-DESSUS du QR */
    .badge-number {
      position: absolute;
      width: 22px;
      height: 22px;
      background: #FF8C00;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      z-index: 11;
      top: 54px;
      left: 50%;
      transform: translateX(-50%);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    /* Container QR - CARRÉ, NO overlay */
    .qr-container {
      position: relative;
      width: 100px;
      height: 100px;
      margin: 14px 0 8px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      overflow: hidden;
    }

    .qr-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Footer texte */
    .footer {
      text-align: center;
      margin-top: 6px;
      font-size: 0;
    }

    .footer-main {
      font-size: 9px;
      font-weight: 700;
      color: #FF8C00;
      letter-spacing: 0.3px;
      line-height: 1.1;
    }

    .footer-sub {
      font-size: 7px;
      color: #FF8C00;
      margin-top: 1px;
      letter-spacing: 0.2px;
      opacity: 0.8;
      line-height: 1;
    }

    /* Code QR discret */
    .qr-code-text {
      font-size: 6px;
      color: #999;
      margin-top: 3px;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.3px;
      text-align: center;
      font-weight: 600;
    }

    @media print {
      body {
        background: white;
        padding: 0;
        margin: 0;
      }
      .page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
      }
    }

    @media screen {
      body {
        padding: 20px;
        background: #f5f5f5;
      }
      .page {
        margin: 0 auto 20px;
      }
    }
  </style>
</head>
<body>`;

  // Générer chaque page
  pages.forEach((pageItems, pageIndex) => {
    html += `<div class="page">`;

    // Remplir avec 8 cartes (ou moins si c'est la dernière page)
    pageItems.forEach((item, itemIndex) => {
      const absoluteIndex = pageIndex * 8 + itemIndex + 1;
      const qrUrl = `${appUrl}/t/${item.code}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&color=FF8C00&bgcolor=ffffff&qzone=0`;

      html += `
        <div class="qr-card">
          <div class="header">TableQR</div>
          
          <div class="badge-number">${absoluteIndex}</div>
          
          <div class="qr-container">
            <img src="${qrImageUrl}" alt="QR Code ${item.code}" />
          </div>
          
          <div class="footer">
            <div class="footer-main">Scanner pour le menu</div>
            <div class="footer-sub">Scan for Menu</div>
          </div>
          
          <div class="qr-code-text">${item.code}</div>
        </div>
      `;
    });

    html += `</div>`;
  });

  html += `
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 500);
    });
  </script>
</body>
</html>`;

  return html;
}

// Échapper les caractères HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
