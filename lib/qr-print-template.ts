/**
 * Générateur de template d'impression QR personnalisé
 * Design: Orange vif, logo fourchette/couteau, script TableQR, badge de numérotation
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
  // SVG logo fourchette + couteau (minimaliste)
  const forkKnifeSVG = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Fourchette -->
      <g transform="translate(8, 8)">
        <line x1="4" y1="0" x2="4" y2="28" stroke="#FF8C00" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="2" cy="28" r="1.5" fill="#FF8C00"/>
        <circle cx="4" cy="28" r="1.5" fill="#FF8C00"/>
        <circle cx="6" cy="28" r="1.5" fill="#FF8C00"/>
        <line x1="2" y1="4" x2="2" y2="10" stroke="#FF8C00" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="4" y1="4" x2="4" y2="10" stroke="#FF8C00" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="6" y1="4" x2="6" y2="10" stroke="#FF8C00" stroke-width="1.5" stroke-linecap="round"/>
      </g>
      <!-- Couteau -->
      <g transform="translate(24, 8)">
        <line x1="4" y1="0" x2="4" y2="28" stroke="#FF8C00" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="4" cy="28" r="1.5" fill="#FF8C00"/>
        <path d="M 2 4 Q 4 6 6 4" stroke="#FF8C00" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <line x1="4" y1="6" x2="4" y2="24" stroke="#FF8C00" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>
  `;

  // Grouper les QR codes par 4 (4 par page A4)
  const pages: QRItem[][] = [];
  for (let i = 0; i < items.length; i += 4) {
    pages.push(items.slice(i, i + 4));
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
      margin: 15mm;
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
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 10mm;
      padding: 15mm;
      page-break-after: always;
      margin-bottom: 20px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    .qr-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 1px solid #f0f0f0;
      border-radius: 12px;
      padding: 16px;
      page-break-inside: avoid;
      overflow: hidden;
    }

    /* En-tête TableQR */
    .header {
      font-family: 'Great Vibes', cursive;
      font-size: 28px;
      color: #FF8C00;
      font-weight: 600;
      margin-bottom: 12px;
      letter-spacing: 2px;
      font-style: italic;
    }

    /* Container QR + logo */
    .qr-container {
      position: relative;
      width: 160px;
      height: 160px;
      margin: 12px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
      border-radius: 12px;
      overflow: hidden;
    }

    .qr-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Logo fourchette/couteau au centre */
    .qr-logo-overlay {
      position: absolute;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
    }

    /* Badge de numérotation - haut à droite */
    .badge-number {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 36px;
      height: 36px;
      background: #FF8C00;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(255, 140, 0, 0.3);
      z-index: 11;
    }

    /* Texte sous le QR */
    .label {
      font-size: 12px;
      font-weight: 600;
      color: #333;
      margin-top: 8px;
      text-align: center;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Pied de page */
    .footer {
      text-align: center;
      margin-top: 10px;
    }

    .footer-main {
      font-size: 13px;
      font-weight: 700;
      color: #FF8C00;
      letter-spacing: 0.5px;
    }

    .footer-sub {
      font-size: 10px;
      color: #FF8C00;
      margin-top: 2px;
      letter-spacing: 0.3px;
      opacity: 0.85;
    }

    /* Code QR discret */
    .qr-code-text {
      font-size: 8px;
      color: #999;
      margin-top: 6px;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
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

    /* Responsive pour affichage écran avant impression */
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

    // Remplir avec 4 cartes (ou moins si c'est la dernière page)
    pageItems.forEach((item, itemIndex) => {
      const absoluteIndex = pageIndex * 4 + itemIndex + 1;
      const qrUrl = `${appUrl}/t/${item.code}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&color=FF8C00&bgcolor=ffffff&qzone=1`;

      html += `
        <div class="qr-card">
          <div class="badge-number">${absoluteIndex}</div>
          
          <div class="header">TableQR</div>
          
          <div class="qr-container">
            <img src="${qrImageUrl}" alt="QR Code ${item.code}" />
            <div class="qr-logo-overlay">
              ${forkKnifeSVG}
            </div>
          </div>
          
          ${item.label ? `<div class="label">${escapeHtml(item.label)}</div>` : ''}
          
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
