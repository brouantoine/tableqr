/**
 * Générateur de template d'impression QR personnalisé
 * Design: Orange vif sur fond noir, 8 QR par A4, scanables à 100%
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
  // Grouper les QR codes par 8 (8 par page A4)
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
      margin: 0;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #1a1a1a;
      padding: 0;
    }

    .page {
      width: 210mm;
      height: 297mm;
      background: white;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 0;
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
      background: black;
      padding: 16px;
      page-break-inside: avoid;
      overflow: hidden;
      border: 0.5px solid #333;
    }

    /* Marques de découpe - croix aux 4 coins */
    .qr-card::before,
    .qr-card::after {
      content: '';
      position: absolute;
      background: #FF8C00;
    }

    .qr-card::before {
      width: 2px;
      height: 10px;
      top: 0;
      left: 0;
    }

    .qr-card::after {
      width: 10px;
      height: 2px;
      top: 0;
      left: 0;
    }

    /* Marques coin haut-droit */
    .qr-corner-tr::before,
    .qr-corner-tr::after {
      content: '';
      position: absolute;
      background: #FF8C00;
    }

    .qr-corner-tr::before {
      width: 2px;
      height: 10px;
      top: 0;
      right: 0;
    }

    .qr-corner-tr::after {
      width: 10px;
      height: 2px;
      top: 0;
      right: 0;
    }

    /* Marques coin bas-gauche */
    .qr-corner-bl {
      position: relative;
    }

    .qr-corner-bl::before,
    .qr-corner-bl::after {
      content: '';
      position: absolute;
      background: #FF8C00;
    }

    .qr-corner-bl::before {
      width: 2px;
      height: 10px;
      bottom: 0;
      left: 0;
    }

    .qr-corner-bl::after {
      width: 10px;
      height: 2px;
      bottom: 0;
      left: 0;
    }

    /* Marques coin bas-droit */
    .qr-corner-br {
      position: relative;
    }

    .qr-corner-br::before,
    .qr-corner-br::after {
      content: '';
      position: absolute;
      background: #FF8C00;
    }

    .qr-corner-br::before {
      width: 2px;
      height: 10px;
      bottom: 0;
      right: 0;
    }

    .qr-corner-br::after {
      width: 10px;
      height: 2px;
      bottom: 0;
      right: 0;
    }

    /* Container QR - SANS OVERLAY pour le rendre scannable */
    .qr-container {
      position: relative;
      width: 140px;
      height: 140px;
      margin: 8px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: black;
      border-radius: 4px;
      overflow: hidden;
    }

    .qr-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Texte sous le QR */
    .footer {
      text-align: center;
      margin-top: 6px;
    }

    .footer-main {
      font-size: 11px;
      font-weight: 700;
      color: #FF8C00;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }

    .footer-sub {
      font-size: 9px;
      color: #FF8C00;
      margin-top: 1px;
      letter-spacing: 0.3px;
      opacity: 0.85;
      line-height: 1.1;
    }

    /* Code QR discret */
    .qr-code-text {
      font-size: 7px;
      color: #666;
      margin-top: 4px;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.5px;
      text-align: center;
      font-weight: 600;
    }

    /* Badge de numérotation - haut à droite */
    .badge-number {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 28px;
      height: 28px;
      background: #FF8C00;
      color: black;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      z-index: 11;
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
        background: #1a1a1a;
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
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrUrl)}&color=FF8C00&bgcolor=000000&qzone=0`;

      // Déterminer les classes de coin
      const isFirstRow = itemIndex < 4;
      const isLastRow = itemIndex >= 4;
      const isLeftColumn = itemIndex % 4 === 0;
      const isRightColumn = itemIndex % 4 === 3;

      let cornerClasses = 'qr-card';
      if (isFirstRow && isRightColumn) cornerClasses += ' qr-corner-tr';
      if (isLastRow && isLeftColumn) cornerClasses += ' qr-corner-bl';
      if (isLastRow && isRightColumn) cornerClasses += ' qr-corner-br';

      html += `
        <div class="${cornerClasses}">
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
