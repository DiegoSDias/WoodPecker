export function buildPrintDocument({
    documentTitle,
    title,
    metaRows = [],
    contentHtml,
    summaryHtml,
}) {
    return `<!doctype html>
<html lang="pt-BR">
    <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>
            @page {
                margin: 18mm;
            }

            * {
                box-sizing: border-box;
            }

            body {
                color: #2b211b;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 13px;
                line-height: 1.45;
                margin: 0;
            }

            h1,
            h2,
            h3 {
                color: #653018;
                margin: 0;
            }

            h1 {
                font-size: 28px;
                margin-bottom: 16px;
            }

            h2 {
                font-size: 20px;
                margin: 24px 0 10px;
            }

            h3 {
                font-size: 16px;
                margin: 18px 0 8px;
            }

            h3 span {
                color: #8a5b33;
                font-size: 12px;
                margin-left: 8px;
            }

            .meta,
            .summary,
            .problem-card {
                background: #fffaf4;
                border: 1px solid #eadccb;
                border-radius: 8px;
                margin-bottom: 18px;
                padding: 12px 14px;
            }

            .meta p,
            .summary p,
            .problem-card p,
            .pivot {
                margin: 4px 0;
            }

            .problem-grid {
                display: grid;
                gap: 12px;
                grid-template-columns: 1fr 1fr;
            }

            table {
                border-collapse: collapse;
                margin: 8px 0 10px;
                page-break-inside: avoid;
                width: 100%;
            }

            th,
            td {
                border: 1px solid #d9c7b4;
                padding: 6px 7px;
                text-align: center;
                vertical-align: middle;
            }

            th {
                background: #eadccb;
                color: #653018;
                font-weight: 700;
            }

            td:first-child {
                font-weight: 700;
            }

            .pivot {
                color: #653018;
            }

            .iteration,
            .problem-card {
                page-break-inside: avoid;
            }

            .footer {
                border-top: 1px solid #eadccb;
                color: #777777;
                font-size: 11px;
                margin-top: 24px;
                padding-top: 8px;
            }
        </style>
    </head>
    <body>
        <h1>${escapeHtml(title)}</h1>

        ${
            metaRows.length > 0
                ? `<section class="meta">${metaRows
                      .map(
                          ([label, value]) =>
                              `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`
                      )
                      .join('')}</section>`
                : ''
        }

        ${contentHtml}

        ${summaryHtml ? `<section class="summary">${summaryHtml}</section>` : ''}

        <p class="footer">Relatório gerado pelo sistema Woodpecker.</p>
    </body>
</html>`;
}

export function buildPrintTable(headers, rows) {
    return `
        <table>
            <thead>
                <tr>
                    ${headers
                        .map((header) => `<th>${escapeHtml(header)}</th>`)
                        .join('')}
                </tr>
            </thead>
            <tbody>
                ${rows
                    .map(
                        (row) => `
                            <tr>
                                ${row
                                    .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                                    .join('')}
                            </tr>
                        `
                    )
                    .join('')}
            </tbody>
        </table>
    `;
}

export function escapeHtml(value) {
    return String(value ?? '-')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function openPrintWindow(html) {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 250);
}

export function buildFileBaseName(value) {
    return String(value || 'resultado')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}
