export interface QRItem {
  code: string
  label?: string
}

export function generateQRPrintHTML(
  items: QRItem[],
  appUrl: string,
  batchName?: string
): string {
  const ITEMS_PER_PAGE = 8
  const pages: QRItem[][] = []
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE))
  }

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Codes${batchName ? ` — ${batchName}` : ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /*
     * Page A4 : 210mm × 297mm
     * Padding : 8mm de chaque côté
     * Grille   : 2 colonnes × 4 lignes, gap 4mm
     * → largeur cellule  : (210 - 16 - 4) / 2  = 95mm
     * → hauteur cellule  : (297 - 16 - 12) / 4  = 67.25mm
     */
    .page {
      width: 210mm;
      height: 297mm;
      padding: 8mm;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(4, 1fr);
      gap: 4mm;
      background: #fff;
      overflow: hidden;
      page-break-after: always;
    }

    /* ── Zone de découpe : bordure grise en pointillés ── */
    .label {
      position: relative;
      border: 1.2px dashed #bbb;
      border-radius: 2px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 6mm 3.5mm 2.5mm;
    }

    /* Icône ciseaux coin supérieur gauche */
    .scissors {
      position: absolute;
      top: -8px;
      left: 2px;
      font-size: 12px;
      color: #aaa;
      background: white;
      padding: 0 2px;
      line-height: 1;
      user-select: none;
    }

    /* ── Bloc principal fond noir ── */
    .card {
      width: 100%;
      flex: 1;
      background: #000;
      border-radius: 3mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5mm 3mm 4mm;
      position: relative;
      gap: 2mm;
    }

    /* ── Pastille orange numérotée, à cheval sur le coin ── */
    .badge {
      position: absolute;
      top: -10px;
      left: 8px;
      width: 22px;
      height: 22px;
      background: #FF8C00;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 800;
      color: #000;
      z-index: 5;
      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
    }

    /*
     * QR code : modules orange sur fond blanc pour garantir la scannabilité.
     * Le fond blanc crée un encart lumineux dans le bloc noir.
     */
    .qr-img {
      width: 38mm;
      height: 38mm;
      display: block;
      border-radius: 1.5mm;
    }

    .text-main {
      font-size: 8px;
      font-weight: 700;
      color: #FF8C00;
      letter-spacing: 0.3px;
      text-align: center;
    }

    .text-sub {
      font-size: 6.5px;
      font-weight: 400;
      color: #FF8C00;
      opacity: 0.8;
      text-align: center;
    }

    /* ── Code alphanumérique : hors du bloc noir, bas de la zone de découpe ── */
    .code-text {
      font-family: 'Courier New', monospace;
      font-size: 6px;
      color: #888;
      letter-spacing: 1.2px;
      margin-top: 2mm;
      text-align: center;
    }

    @media print {
      body { background: white; }
      .page { box-shadow: none; }
      .scissors { background: white; }
    }

    @media screen {
      body {
        background: #d0d0d0;
        padding: 24px;
      }
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

    pageItems.forEach((item, itemIndex) => {
      const n = pageIndex * ITEMS_PER_PAGE + itemIndex + 1
      const qrUrl = `${appUrl}/t/${item.code}`
      // orange sur blanc → scannabilité maximale, visuellement orange dans le bloc noir
      const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&color=FF8C00&bgcolor=FFFFFF&qzone=1`

      html += `
  <div class="label">
    <span class="scissors">✂</span>
    <div class="card">
      <div class="badge">${n}</div>
      <img class="qr-img" src="${qrImgSrc}" alt="QR ${item.code}" />
      <div class="text-main">Scanner pour le menu</div>
      <div class="text-sub">Scan for Menu</div>
    </div>
    <div class="code-text">${item.code}</div>
  </div>`
    })

    html += `\n</div>`
  })

  html += `
<script>
  // Déclenche l'impression une fois toutes les images QR chargées
  window.addEventListener('load', () => {
    const imgs = document.querySelectorAll('img');
    let done = 0;
    const fire = () => { if (++done >= imgs.length) setTimeout(() => window.print(), 400); };
    if (!imgs.length) return setTimeout(() => window.print(), 400);
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
