export interface QRItem {
  code: string
  label?: string
}

const UTENSILS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/></svg>`

const SMARTPHONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`

export function generateQRPrintHTML(
  items: QRItem[],
  appUrl: string,
  batchName?: string
): string {
  const ITEMS_PER_PAGE = 9
  const pages: QRItem[][] = []
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE))
  }

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Codes${batchName ? ` — ${escapeHtml(batchName)}` : ''}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: A4 portrait; margin: 0; }

    body {
      font-family: 'Poppins', 'Segoe UI', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /*
     * Page A4 : 210mm × 297mm
     * Padding 8mm + grille 3 col × 3 lignes, gap 5mm
     * → cellule : (210 - 16 - 10) / 3 = 61.3mm × (297 - 16 - 10) / 3 = 90.3mm
     */
    .page {
      width: 210mm;
      height: 297mm;
      padding: 8mm;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 5mm;
      background: #fff;
      overflow: hidden;
      page-break-after: always;
    }

    /* Zone de découpe (pointillés) */
    .label {
      position: relative;
      border: 1.2px dashed #c8c8c8;
      border-radius: 2px;
      padding: 4mm 3mm 3mm;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .scissors {
      position: absolute;
      top: -7px;
      left: 3px;
      font-size: 10px;
      color: #aaa;
      background: white;
      padding: 0 2px;
      line-height: 1;
      user-select: none;
    }

    /* ═══ CARTE QR ═══ */
    .qr-card {
      width: 100%;
      flex: 1;
      border-radius: 5mm;
      overflow: hidden;
      background: linear-gradient(180deg, #d62828 0%, #9d0208 100%);
      display: flex;
      flex-direction: column;
      box-shadow: 0 2mm 4mm rgba(0,0,0,0.18);
    }

    /* HEADER */
    .qr-header {
      text-align: center;
      padding: 4mm 3mm 2mm;
      color: white;
    }

    .qr-header .icon {
      display: flex;
      justify-content: center;
      margin-bottom: 1mm;
    }

    .qr-header .icon svg {
      width: 7mm;
      height: 7mm;
      color: white;
    }

    .qr-header h1 {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 1.8px;
      margin: 1mm 0 0;
    }

    .divider {
      width: 9mm;
      height: 0.7mm;
      background: white;
      margin: 1.5mm auto 0;
      border-radius: 1mm;
      opacity: 0.95;
    }

    /* ZONE QR */
    .qr-container {
      background: white;
      margin: 2mm auto 3mm;
      padding: 2mm;
      border-radius: 3mm;
      width: 36mm;
      height: 36mm;
    }

    .qr-container img {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* FOOTER blanc avec coin arrondi en haut-gauche */
    .qr-footer {
      background: white;
      border-top-left-radius: 14mm;
      padding: 0 3mm 3.5mm;
      text-align: center;
      margin-top: auto;
      position: relative;
    }

    .qr-footer .phone {
      background: #d62828;
      width: 9mm;
      height: 9mm;
      border-radius: 50%;
      margin: -4.5mm auto 1.5mm;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1mm 2mm rgba(214, 40, 40, 0.35);
    }

    .qr-footer .phone svg {
      width: 4.2mm;
      height: 4.2mm;
      color: white;
    }

    .qr-footer .scan-fr {
      font-size: 8.5px;
      margin: 0.8mm 0 0;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 0.2px;
    }

    .qr-footer .scan-en {
      font-size: 7px;
      color: #999;
      margin-top: 0.3mm;
      font-style: italic;
    }

    /* Code discret — sans contour, juste texte gris */
    .code-text {
      margin-top: 2mm;
      font-family: 'Courier New', monospace;
      font-size: 6px;
      color: #b8b8b8;
      letter-spacing: 1.4px;
      text-align: center;
    }

    @media print {
      body { background: white; }
      .scissors { background: white; }
    }

    @media screen {
      body { background: #d8d8d8; padding: 24px; }
      .page {
        margin: 0 auto 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      }
    }
  </style>
</head>
<body>`

  pages.forEach((pageItems, pageIndex) => {
    html += `\n<div class="page">`

    pageItems.forEach((item) => {
      const qrUrl = `${appUrl}/t/${item.code}`
      const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&color=000000&bgcolor=FFFFFF&qzone=1&margin=0`

      html += `
  <div class="label">
    <span class="scissors">&#9986;</span>
    <div class="qr-card">
      <div class="qr-header">
        <div class="icon">${UTENSILS_SVG}</div>
        <h1>NOTRE MENU</h1>
        <div class="divider"></div>
      </div>
      <div class="qr-container">
        <img src="${qrImgSrc}" alt="QR ${escapeHtml(item.code)}" />
      </div>
      <div class="qr-footer">
        <div class="phone">${SMARTPHONE_SVG}</div>
        <p class="scan-fr">Scannez pour découvrir</p>
        <p class="scan-en">Scan to view our menu</p>
      </div>
    </div>
    <div class="code-text">${escapeHtml(item.code)}</div>
  </div>`
    })

    html += `\n</div>`
  })

  html += `
<script>
  window.addEventListener('load', () => {
    const imgs = document.querySelectorAll('img');
    let done = 0;
    const fire = () => { if (++done >= imgs.length) setTimeout(() => window.print(), 500); };
    if (!imgs.length) return setTimeout(() => window.print(), 500);
    imgs.forEach(img => {
      if (img.complete) fire();
      else { img.addEventListener('load', fire); img.addEventListener('error', fire); }
    });
  });
</script>
</body>
</html>`

  return html
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
