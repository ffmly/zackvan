// Renders Zackvan's project documentation to a print-ready PDF.
//
//   npx tsx scripts/generate-docs-pdf.mts
//
// Content is expressed as a structured block tree rather than HTML, and laid
// out directly onto the jsPDF canvas. jsPDF's own html() path depends on
// html2canvas, which needs a real browser; laying out the blocks here keeps the
// generator dependency-light and gives exact control over pagination.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { jsPDF } from 'jspdf';

/* --------------------------------------------------------------- palette */

const BRAND: RGB = [15, 92, 71];
const TEAL: RGB = [15, 118, 110];
const INK: RGB = [15, 23, 42];
const BODY: RGB = [30, 41, 59];
const MUTED: RGB = [100, 116, 139];
const HAIRLINE: RGB = [203, 213, 225];
const PANEL: RGB = [241, 245, 249];
const PAGE_BG: RGB = [246, 248, 249];
const CODE_BG: RGB = [238, 242, 244];
const WHITE: RGB = [255, 255, 255];

type RGB = [number, number, number];

/* ---------------------------------------------------------- content model */

type Align = 'left' | 'center' | 'right';

interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  mono?: boolean;
}

type Block =
  | { kind: 'h1'; runs: TextRun[] }
  | { kind: 'h2'; runs: TextRun[] }
  | { kind: 'h3'; runs: TextRun[] }
  | { kind: 'p'; runs: TextRun[] }
  | { kind: 'note'; runs: TextRun[] }
  | { kind: 'bullet'; runs: TextRun[] }
  | { kind: 'number'; index: number; runs: TextRun[] }
  | { kind: 'code'; lines: string[] }
  | { kind: 'coverBrand'; text: string }
  | { kind: 'coverSub'; text: string }
  | { kind: 'coverTitle'; text: string }
  | { kind: 'coverDesc'; text: string }
  | {
      kind: 'table';
      head: TextRun[][];
      rows: TextRun[][][];
      widths?: number[];
    }
  | { kind: 'spacer'; height: number };

interface PageSpec {
  title: string;
  blocks: Block[];
}

/* ------------------------------------------------------------- inline text */

const b = (text: string): TextRun => ({ text, bold: true });
const i = (text: string): TextRun => ({ text, italic: true });
const m = (text: string): TextRun => ({ text, mono: true });
const t = (text: string): TextRun => ({ text });
const p = (...runs: (TextRun | string)[]): TextRun[] =>
  runs.map((r) => (typeof r === 'string' ? t(r) : r));

/* ------------------------------------------------------------- the document */

const h1 = (s: string): Block => ({ kind: 'h1', runs: p(s) });
const h2 = (s: string): Block => ({ kind: 'h2', runs: p(s) });
const h3 = (s: string): Block => ({ kind: 'h3', runs: p(s) });
const para = (...runs: (TextRun | string)[]): Block => ({
  kind: 'p',
  runs: p(...runs),
});
const note = (...runs: (TextRun | string)[]): Block => ({
  kind: 'note',
  runs: p(...runs),
});
const bullet = (...runs: (TextRun | string)[]): Block => ({
  kind: 'bullet',
  runs: p(...runs),
});
const numbered = (index: number, ...runs: (TextRun | string)[]): Block => ({
  kind: 'number',
  index,
  runs: p(...runs),
});
const code = (text: string): Block => ({
  kind: 'code',
  lines: text.replace(/\t/g, '  ').split('\n'),
});
const spacer = (height: number): Block => ({ kind: 'spacer', height });

/** Table cells are authored interchangeably as a run, a string, or a run list. */
const cell = (c: TextRun | string | TextRun[]): TextRun[] =>
  Array.isArray(c) ? c : [typeof c === 'string' ? t(c) : c];

const table = (
  head: (TextRun | string | TextRun[])[],
  rows: (TextRun | string | TextRun[])[][],
  widths?: number[],
): Block => ({
  kind: 'table',
  head: head.map(cell),
  rows: rows.map((r) => r.map(cell)),
  widths,
});

/* ---------------------------------------------------------------- layout */

const FONT = 'helvetica';
const FONT_MONO = 'courier';

const SIZE = {
  h1: 19,
  h2: 12.5,
  h3: 10.5,
  body: 9.4,
  table: 8.3,
  code: 7.9,
} as const;

const LEAD = {
  h1: 1.3,
  h2: 1.3,
  h3: 1.3,
  body: 1.42,
  table: 1.34,
  code: 1.38,
} as const;

class Renderer {
  private doc: jsPDF;

  private pageW: number;

  private pageH: number;

  private margin = 54;

  private contentW: number;

  private y = 0;

  /** jsPDF starts with one empty page; the cover must be drawn onto it. */
  private started = false;

  constructor() {
    this.doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    this.pageW = this.doc.internal.pageSize.getWidth();
    this.pageH = this.doc.internal.pageSize.getHeight();
    this.contentW = this.pageW - this.margin * 2;
  }

  /* ------------------------------------------------------- text measuring */

  private runFont(run: TextRun): string {
    return run.mono ? FONT_MONO : FONT;
  }

  private runStyle(run: TextRun): string {
    if (run.mono) return 'normal';
    if (run.bold) return 'bold';
    return run.italic ? 'italic' : 'normal';
  }

  private runWidth(run: TextRun, size: number): number {
    this.setInk(run, size);
    return this.doc.getTextWidth(run.text);
  }

  private setInk(run: TextRun, size: number): void {
    this.doc.setFont(this.runFont(run), this.runStyle(run));
    this.doc.setFontSize(size);
  }

  /* ----------------------------------------------------------- pagination */

  /**
   * Footers are stamped in a second pass. They carry the total page count,
   * which is not known until every page has been laid out, so drawing them
   * inline would print "Page 2 of 0" on all but the last page.
   */
  private stampFooters(): void {
    const total = this.doc.getNumberOfPages();
    for (let page = 1; page <= total; page += 1) {
      this.doc.setPage(page);
      if (page === 1) continue;
      this.doc.setFont(FONT, 'normal');
      this.doc.setFontSize(7.6);
      this.doc.setTextColor(...MUTED);
      this.doc.text(`Page ${page} of ${total}`, this.pageW / 2, this.pageH - 26, {
        align: 'center',
      });
      this.doc.setDrawColor(...HAIRLINE);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin, this.pageH - 38, this.pageW - this.margin, this.pageH - 38);
    }
    this.doc.setPage(total);
  }

  private beginPage(cover: boolean): void {
    if (this.started) {
      this.doc.addPage();
    }
    this.started = true;
    this.doc.setFillColor(...PAGE_BG);
    this.doc.rect(0, 0, this.pageW, this.pageH, 'F');

    if (cover) {
      this.y = 118;
      return;
    }

    this.doc.setFillColor(...BRAND);
    this.doc.rect(0, 0, this.pageW, 6, 'F');

    this.doc.setFont(FONT, 'bold');
    this.doc.setFontSize(7.6);
    this.doc.setTextColor(...BRAND);
    this.doc.text('ZACKVAN ALGERIA', this.margin, 38);

    this.doc.setFont(FONT, 'normal');
    this.doc.setTextColor(...MUTED);
    this.doc.text('Project Documentation', this.pageW - this.margin, 38, {
      align: 'right',
    });

    this.doc.setDrawColor(...HAIRLINE);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, 45, this.pageW - this.margin, 45);
    this.y = 62;
  }

  private ensure(height: number): void {
    if (this.y + height <= this.pageH - 52) return;
    this.beginPage(false);
  }

  /* -------------------------------------------------------- text wrapping */

  /**
   * Greedily wraps a run sequence into lines that fit `width`, breaking inside
   * a run when necessary. Returns one flattened run array per output line.
   */
  private wrap(runs: TextRun[], size: number, width: number): TextRun[][] {
    const lines: TextRun[][] = [];
    let current: TextRun[] = [];
    let used = 0;

    const flush = () => {
      if (current.length) lines.push(current);
      current = [];
      used = 0;
    };

    for (const run of runs) {
      const words = run.text.split(/(\s+)/).filter((w) => w.length > 0);

      for (const word of words) {
        const w = this.runWidth(run, size);

        if (used + w > width && current.length > 0) {
          // Trailing whitespace must not push a line over the edge.
          if (/^\s+$/.test(word)) {
            flush();
            continue;
          }
          flush();
        }

        if (w > width) {
          // A single token longer than the line: hard-split it.
          let rest = word;
          while (rest.length > 0) {
            let slice = '';
            for (const ch of rest) {
              if (this.runWidth({ ...run, text: slice + ch }, size) > width && slice) {
                break;
              }
              slice += ch;
            }
            if (!slice) slice = rest[0];
            current.push({ ...run, text: slice });
            used += this.runWidth({ ...run, text: slice }, size);
            rest = rest.slice(slice.length);
            if (rest.length > 0) {
              flush();
            }
          }
          continue;
        }

        if (current.length === 0) current.push({ ...run, text: '' });
        current[current.length - 1] = {
          ...current[current.length - 1],
          text: current[current.length - 1].text + word,
        };
        used += w;
      }
    }
    flush();

    return lines.length ? lines : [[]];
  }

  private drawLines(
    lines: TextRun[][],
    size: number,
    lead: number,
    color: RGB,
    x: number,
    width: number,
  ): number {
    const lh = size * lead;
    for (const line of lines) {
      this.ensure(lh);
      let cx = x;
      for (const run of line) {
        if (run.text.length === 0) continue;
        this.setInk(run, size);
        this.doc.setTextColor(...color);
        this.doc.text(run.text, cx, this.y);
        cx += this.runWidth(run, size);
      }
      this.y += lh;
    }
    return this.y;
  }

  /* ------------------------------------------------------------- blocks */

  private heading(level: 1 | 2 | 3, runs: TextRun[]): void {
    const size = SIZE[`h${level}`];
    const color = level === 1 ? INK : level === 2 ? BRAND : TEAL;

    this.ensure(size * 1.6 + 10);
    if (level === 1) this.y += 6;

    const lines = this.wrap(runs, size, this.contentW);
    this.drawLines(lines, size, LEAD.h1, color, this.margin, this.contentW);

    if (level === 1) {
      this.doc.setDrawColor(...BRAND);
      this.doc.setLineWidth(1.8);
      this.doc.line(this.margin, this.y + 3, this.margin + 40, this.y + 3);
      this.y += 14;
    } else {
      this.y += 4;
    }
  }

  private paragraph(runs: TextRun[], indent = 0, color: RGB = BODY): void {
    const width = this.contentW - indent;
    const lines = this.wrap(runs, SIZE.body, width);
    this.drawLines(lines, SIZE.body, LEAD.body, color, this.margin + indent, width);
    this.y += 6;
  }

  private codeBlock(lines: string[]): void {
    const lh = SIZE.code * LEAD.code;
    const padX = 8;
    const innerW = this.contentW - padX * 2;

    this.ensure(lh * Math.min(lines.length, 4) + 14);

    const wrapped: string[] = [];
    for (const raw of lines) {
      if (raw.length === 0) {
        wrapped.push('');
        continue;
      }
      this.doc.setFont(FONT_MONO, 'normal');
      this.doc.setFontSize(SIZE.code);
      const maxChars = Math.floor(innerW / (SIZE.code * 0.601));
      if (raw.length <= maxChars) {
        wrapped.push(raw);
      } else {
        let rest = raw;
        while (rest.length > maxChars) {
          wrapped.push(rest.slice(0, maxChars));
          rest = rest.slice(maxChars);
        }
        if (rest.length) wrapped.push(rest);
      }
    }

    const boxH = wrapped.length * lh + padX * 2;

    // Split the block across pages if it is taller than the remaining space.
    let remaining = wrapped;
    let first = true;
    while (remaining.length > 0) {
      const available = this.pageH - 52 - this.y - (first ? 0 : 8);
      const fits = Math.floor((available - padX * 2) / lh);
      if (fits < 1) {
        this.beginPage(false);
        first = false;
        continue;
      }
      const slice = remaining.slice(0, fits);
      const sliceH = slice.length * lh + padX * 2;

      this.doc.setFillColor(...CODE_BG);
      this.doc.rect(this.margin, this.y, this.contentW, sliceH, 'F');

      let ty = this.y + padX;
      for (const ln of slice) {
        this.doc.setFont(FONT_MONO, 'normal');
        this.doc.setFontSize(SIZE.code);
        this.doc.setTextColor(...BODY);
        this.doc.text(ln, this.margin + padX, ty);
        ty += lh;
      }

      this.y += sliceH;
      remaining = remaining.slice(fits);
      if (remaining.length > 0) {
        this.beginPage(false);
        first = false;
      }
    }

    this.y += 8;
  }

  private noteBlock(runs: TextRun[]): void {
    const pad = 9;
    const barW = 2.5;
    const innerW = this.contentW - pad * 2 - barW - 4;
    const lines = this.wrap(runs, SIZE.body - 0.3, innerW);
    const lh = (SIZE.body - 0.3) * LEAD.body;
    const boxH = lines.length * lh + pad * 2;

    this.ensure(boxH);
    this.doc.setFillColor(...PANEL);
    this.doc.rect(this.margin, this.y, this.contentW, boxH, 'F');
    this.doc.setFillColor(...BRAND);
    this.doc.rect(this.margin, this.y, barW, boxH, 'F');

    let ty = this.y + pad;
    for (const line of lines) {
      let cx = this.margin + pad + barW + 4;
      for (const run of line) {
        if (!run.text.length) continue;
        this.setInk(run, SIZE.body - 0.3);
        this.doc.setTextColor(...BODY);
        this.doc.text(run.text, cx, ty);
        cx += this.runWidth(run, SIZE.body - 0.3);
      }
      ty += lh;
    }
    this.y += boxH + 9;
  }

  private listItem(
    marker: string,
    markerColor: RGB,
    runs: TextRun[],
    indent: number,
  ): void {
    const markerW = 16;
    const width = this.contentW - indent - markerW;
    const lines = this.wrap(runs, SIZE.body, width);
    this.drawLines(
      lines,
      SIZE.body,
      LEAD.body,
      BODY,
      this.margin + indent + markerW,
      width,
    );

    // Repaint the marker against the first line of the item.
    const firstLineY = this.y - lines.length * SIZE.body * LEAD.body;
    this.doc.setFont(FONT, 'bold');
    this.doc.setFontSize(SIZE.body);
    this.doc.setTextColor(...markerColor);
    this.doc.text(marker, this.margin + indent, firstLineY);
    this.y += 3;
  }

  private tableBlock(block: Extract<Block, { kind: 'table' }>): void {
    const padX = 5.5;
    const padY = 4.5;

const colCount = block.head.length;
    const widths =
      block.widths ??
      (() => {
        const longest = new Array<number>(colCount).fill(0);
        const measure = (cells: TextRun[][]) => {
          cells.forEach((cell, c) => {
            const len = cell.map((r) => r.text).join('').length;
            longest[c] = Math.max(longest[c], len);
          });
        };
        measure(block.head);
        block.rows.forEach(measure);

        // Weight columns by their longest content, then normalise to fit.
        const total = longest.reduce((a, c) => a + Math.max(c, 6), 0);
        return longest.map((c) => (Math.max(c, 6) / total) * this.contentW);
      })();

    const scale = this.contentW / widths.reduce((a, c) => a + c, 0);
    const cols = widths.map((w) => w * scale);

    const cellLines = (runs: TextRun[], w: number): TextRun[][] =>
      this.wrap(runs, SIZE.table, w - padX * 2);

    // Header row
    const headH =
      Math.max(
        ...block.head.map((r, c) => cellLines(r, cols[c]).length),
      ) *
        SIZE.table * LEAD.table +
      padY * 2;

    this.ensure(headH + 22);

    const drawHeaderRow = (offset: number) => {
      this.doc.setFillColor(...BRAND);
      this.doc.rect(this.margin, this.y + offset, this.contentW, headH, 'F');
      let cx = this.margin;
      block.head.forEach((cell, c) => {
        let ty = this.y + offset + padY + SIZE.table;
        for (const line of cellLines(cell, cols[c])) {
          for (const run of line) {
            this.setInk({ ...run, bold: true }, SIZE.table);
            this.doc.setTextColor(...WHITE);
            this.doc.text(run.text, cx + padX, ty);
          }
          ty += SIZE.table * LEAD.table;
        }
        cx += cols[c];
      });
    };

    drawHeaderRow(0);
    this.y += headH;

    block.rows.forEach((row, rowIdx) => {
      const heights = row.map((cell, c) => cellLines(cell, cols[c]).length);
      const rowH =
        Math.max(...heights) * SIZE.table * LEAD.table + padY * 2;

      if (this.y + rowH > this.pageH - 52) {
        this.beginPage(false);
        drawHeaderRow(0);
        this.y += headH;
      }

      if (rowIdx % 2 === 1) {
        this.doc.setFillColor(...WHITE);
        this.doc.rect(this.margin, this.y, this.contentW, rowH, 'F');
      }

      let cx = this.margin;
      row.forEach((cell, c) => {
        let ty = this.y + padY + SIZE.table;
        for (const line of cellLines(cell, cols[c])) {
          for (const run of line) {
            this.setInk(run, SIZE.table);
            this.doc.setTextColor(...BODY);
            this.doc.text(run.text, cx + padX, ty);
          }
          ty += SIZE.table * LEAD.table;
        }
        cx += cols[c];
      });

      this.doc.setDrawColor(...HAIRLINE);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin, this.y + rowH, this.margin + this.contentW, this.y + rowH);
      this.y += rowH;
    });

    this.y += 10;
  }

  private cover(blocks: Block[]): void {
    const cx = this.pageW / 2;

    for (const block of blocks) {
      switch (block.kind) {
        case 'coverBrand': {
          this.doc.setFont(FONT, 'bold');
          this.doc.setFontSize(38);
          this.doc.setTextColor(...BRAND);
          this.doc.text(block.text, cx, this.y, { align: 'center', charSpace: 6 });
          this.y += 34;
          break;
        }
        case 'coverSub': {
          this.doc.setFont(FONT, 'normal');
          this.doc.setFontSize(13);
          this.doc.setTextColor(...TEAL);
          this.doc.text(block.text, cx, this.y, { align: 'center', charSpace: 4 });
          this.y += 34;
          break;
        }
        case 'coverTitle': {
          this.doc.setFont(FONT, 'bold');
          this.doc.setFontSize(22);
          this.doc.setTextColor(...INK);
          this.doc.text(block.text, cx, this.y, { align: 'center' });
          this.y += 22;
          break;
        }
        case 'coverDesc': {
          this.doc.setFont(FONT, 'normal');
          this.doc.setFontSize(11);
          this.doc.setTextColor(...MUTED);
          this.doc.text(block.text, cx, this.y, { align: 'center' });
          this.y += 26;
          break;
        }
        case 'table': {
          const rows: (TextRun | string)[][][] = [
            [b('Project'), t('Zackvan Algeria')],
            [b('Version'), t('1.0.0')],
            [b('Firebase project'), t('zakivan-79cce')],
            [b('Cloudinary cloud'), t('dvljsghr0')],
            [b('Framework'), t('Next.js 14.2.35 (App Router)')],
            [b('Firestore collections'), t('7')],
            [b('Composite indexes'), t('9')],
            [b('Generated'), t(new Date().toLocaleDateString('en-GB'))],
          ];
          this.tableBlock({
            kind: 'table',
            head: [p('Field'), p('Value')],
            rows: rows.map((r) => [p(r[0]), p(r[1])]),
            widths: [0.34, 0.66],
          });
          break;
        }
        default:
          break;
      }
    }
  }

  render(specs: PageSpec[]): jsPDF {
    specs.forEach((spec, index) => {
      const isCover = index === 0;
      this.beginPage(isCover);

      if (isCover) {
        this.cover(spec.blocks);
        return;
      }

      this.heading(1, p(spec.title));

      for (const block of spec.blocks) {
        switch (block.kind) {
          case 'h1':
            this.heading(1, block.runs);
            break;
          case 'h2':
            this.heading(2, block.runs);
            break;
          case 'h3':
            this.heading(3, block.runs);
            break;
          case 'p':
            this.paragraph(block.runs);
            break;
          case 'note':
            this.noteBlock(block.runs);
            break;
          case 'code':
            this.codeBlock(block.lines);
            break;
          case 'bullet':
            this.listItem('•', TEAL, block.runs, 4);
            break;
          case 'number':
            this.listItem(`${block.index}.`, BRAND, block.runs, 4);
            break;
          case 'table':
            this.tableBlock(block);
            break;
          case 'spacer':
            this.ensure(block.height);
            this.y += block.height;
            break;
          default:
            break;
        }
      }
    });

    this.stampFooters();
    return this.doc;
  }
}

/* ---------------------------------------------------------------- document */

const SPECS: PageSpec[] = [
  {
    title: 'Cover',
    blocks: [
      { kind: 'coverBrand', text: 'ZACKVAN' },
      { kind: 'coverSub', text: 'ALGERIA' },
      { kind: 'coverTitle', text: 'Project Documentation' },
      {
        kind: 'coverDesc',
        text: 'Caravan rental marketplace & interactive nature map of Algeria',
      },
      { kind: 'table', head: [[t('')]], rows: [], widths: [0.34, 0.66] },
    ],
  },

  {
    title: 'Table of Contents',
    blocks: [
      numbered(1, b('Executive Summary')),
      numbered(2, b('Feature Set')),
      numbered(3, b('Technology Stack')),
      numbered(4, b('System Architecture')),
      numbered(5, b('Project Structure')),
      numbered(6, b('Data Model — Firestore')),
      numbered(7, b('Security Rules')),
      numbered(8, b('Authentication & Roles')),
      numbered(9, b('Electronic Contract System')),
      numbered(10, b('Gift Card System')),
      numbered(11, b('Cloudinary Image Pipeline')),
      numbered(12, b('Firestore Indexes')),
      numbered(13, b('Map Features')),
      numbered(14, b('Environment Variables')),
      numbered(15, b('Setup & Deployment')),
      numbered(16, b('User Journeys')),
      numbered(17, b('Operations Runbook')),
      numbered(18, b('Production Roadmap')),
      numbered(19, b('Legal & Compliance Notes')),
      spacer(6),
      para(
        b('Appendix A'),
        ' — launch checklist',
      ),
    ],
  },

  {
    title: '1. Executive Summary',
    blocks: [
      para(
        'Zackvan Algeria is a two-sided marketplace connecting private caravan owners with ',
        'travellers across Algeria, paired with an interactive nature map of the country’s ',
        'national parks, forests, and camping spots.',
      ),
      para(
        'The platform deliberately operates ',
        b('without escrow or any online payment processing'),
        '. Money moves directly between owner and renter, offline, at vehicle handover. ',
        'Zackvan’s role is limited to discovery, booking workflow, and evidentiary ',
        'documentation. This keeps the business inside a regulatory envelope that avoids ',
        'holding customer funds, while the electronic contract system supplies the legal ',
        'record that offline settlement normally lacks.',
      ),
      h2('Design pillars'),
      bullet(
        b('No fund custody.'),
        ' The platform never holds, collects, or transfers money on behalf of anyone.',
      ),
      bullet(
        b('Evidentiary contracts.'),
        ' Every booking produces a tamper-sealed acceptance record with identity, ',
        'timestamp, IP address, and a SHA-256 content hash.',
      ),
      bullet(
        b('Client-first data.'),
        ' Firestore is read and written directly from the browser SDK under strict ',
        'security rules; no privileged backend sits in the request path.',
      ),
      bullet(
        b('Secret-safe uploads.'),
        ' The Cloudinary API secret never leaves the server; the browser only ever ',
        'receives a short-lived signature.',
      ),
      h2('At a glance'),
      table(
        [b('Metric'), b('Value')],
        [
          [t('Routes'), t('13 (9 pages, 2 API routes, 1 asset)')],
          [t('Firestore collections'), t('7')],
          [t('Composite indexes'), t('9')],
          [t('User roles'), t('3 (renter, owner, admin)')],
          [t('Booking states'), t('5')],
          [t('Gift card instruments'), t('2 (wallet credit, trip voucher)')],
          [t('Curated map locations'), t('16')],
          [t('Shared JS payload'), t('~88 kB First Load')],
        ],
        [0.5, 0.5],
      ),
    ],
  },

  {
    title: '2. Feature Set',
    blocks: [
      h2('2.1  Authentication'),
      bullet('Email/password registration and sign-in.'),
      bullet('Google OAuth sign-in with forced account selection.'),
      bullet(
        'Three-role model on the user profile: ',
        m('renter'),
        ', ',
        m('owner'),
        ', ',
        m('admin'),
        '.',
      ),
      bullet(
        'Self-service upgrade: a renter becomes an owner from the dashboard, which ',
        'immediately unlocks listing creation and request management.',
      ),
      bullet('Session persistence across reloads; route guards via RequireAuth.'),

      h2('2.2  Marketplace'),
      bullet(
        'Listing creation and editing with rich specifications: capacity, beds, water ',
        'tank litres, solar panel wattage, bathroom, kitchen, and air conditioning.',
      ),
      bullet('Declarative extras list of equipment the owner includes.'),
      bullet('Publish / unpublish toggle.'),
      bullet(
        'Filtering by wilaya, price band, guest capacity, caravan type, free text, and ',
        'date availability.',
      ),
      bullet('Owner-managed blocked availability ranges layered on top of real bookings.'),

      h2('2.3  Availability engine'),
      para(
        'A date range is unavailable if it overlaps either a booking in an active state ',
        b('(pending or accepted)'),
        ' or an owner-blocked range. Availability is computed from the union of both ',
        'sources before a request is allowed through.',
      ),

      h2('2.4  Electronic contract system'),
      para('Described in detail in section 9.'),

      h2('2.5  Booking lifecycle'),
      table(
        [b('State'), b('Meaning'), b('Who transitions')],
        [
          [m('pending'), t('Request submitted, awaiting owner review'), t('— (initial)')],
          [m('accepted'), t('Owner confirmed the dates'), t('Owner')],
          [m('rejected'), t('Owner declined'), t('Owner')],
          [m('cancelled'), t('Renter withdrew the trip'), t('Renter')],
          [m('completed'), t('Trip finished and handed back'), t('Owner')],
        ],
        [0.22, 0.53, 0.25],
      ),

      h2('2.6  Gift cards'),
      para('Described in detail in section 10.'),

      h2('2.7  Interactive nature map'),
      bullet('Leaflet map centred on Algeria with custom inline-SVG markers.'),
      bullet('Three location types: national park, forest, campsite.'),
      bullet('Filter chips with live per-type counts, plus free-text search over name and wilaya.'),
      bullet(
        'Detail drawer showing terrain, water availability, safety notes, practical tips, ',
        'and best season.',
      ),
      bullet('Responsive: slide-over list panel on mobile, fixed sidebar on desktop.'),
      bullet('Bounded to Algeria with map-boundary viscosity so users cannot pan into the sea.'),
    ],
  },

  {
    title: '3. Technology Stack',
    blocks: [
      table(
        [b('Layer'), b('Technology'), b('Version'), b('Purpose')],
        [
          [t('Framework'), t('Next.js (App Router)'), t('14.2.35'), t('SSR, routing, API routes')],
          [t('Language'), t('TypeScript'), t('5.x'), t('Type safety, strict mode')],
          [t('Styling'), t('Tailwind CSS'), t('3.x'), t('Utility-first styling')],
          [t('Database'), t('Cloud Firestore'), t('—'), t('Document store')],
          [t('Auth'), t('Firebase Authentication'), t('10.x'), t('Email/password, Google')],
          [t('Media'), t('Cloudinary'), t('—'), t('Image hosting & transforms')],
          [t('Maps'), t('Leaflet + React-Leaflet'), t('1.9 / 4.x'), t('Interactive map')],
          [t('Icons'), t('Lucide React'), t('—'), t('Icon set')],
          [t('Class merge'), t('clsx'), t('2.x'), t('Conditional class names')],
          [t('Deploy'), t('Firebase CLI'), t('latest'), t('Rules & index deployment')],
        ],
        [0.16, 0.26, 0.16, 0.42],
      ),
      h2('Why this stack'),
      bullet(
        b('App Router'),
        ' keeps data reads client-side while retaining file-based routing and ',
        'colocated API routes, so the deployment stays a single Node process.',
      ),
      bullet(
        b('Tailwind'),
        ' avoids a component-library dependency and keeps the visual language ',
        'consistent through theme tokens (',
        m('brand'),
        ', ',
        m('teal'),
        ').',
      ),
      bullet(
        b('OSM tiles'),
        ' rather than a commercial tile API: no key required, no billing account, ',
        'and trivially swappable later by changing one URL string.',
      ),
    ],
  },

  {
    title: '4. System Architecture',
    blocks: [
      h2('4.1  Request topology'),
      code(
        [
          'Browser',
          '  │',
          '  ├──►  Next.js App Router pages (React client components)',
          '  │       ├──►  Firebase Auth SDK      (sign-in, session)',
          '  │       ├──►  Firestore Web SDK      (all reads & writes, gated by rules)',
          '  │       └──►  Cloudinary upload API  (direct browser → Cloudinary, signed)',
          '  │',
          '  └──►  Next.js API routes',
          '         ├──  POST /api/cloudinary/sign   computes a SHA-1 signature server-side',
          '         └──  GET  /api/ip                resolves the caller’s public IP',
        ].join('\n'),
      ),
      h2('4.2  Trust boundaries'),
      table(
        [b('Boundary'), b('Enforcement')],
        [
          [
            t('Client → Firestore'),
            p(
              m('firestore.rules'),
              t('; every query and write is authorised server-side by the Firestore '),
              t('security engine. The client is treated as untrusted.'),
            ),
          ],
          [
            t('Client → Cloudinary'),
            p(
              t('Signed uploads. The API secret is only read inside '),
              m('/api/cloudinary/sign'),
              t(' and never returned to the browser.'),
            ),
          ],
          [
            t('Client → itself'),
            p(
              t('Gift card arithmetic is re-derived on the server. A booking’s totals must be '),
              t('internally consistent, and any credit it claims must match a hold that the '),
              t('same transaction placed on the card, so a tampered client cannot post an '),
              t('amount it did not spend. Availability, by contrast, is only checked in the '),
              t('client — see section 7.4.'),
            ),
          ],
        ],
        [0.28, 0.72],
      ),
      h2('4.3  The server is not a privilege tier'),
      para(
        'There is no Firebase Admin SDK in the runtime. Consequently the API layer cannot ',
        'bypass Firestore rules — it only performs two narrow, non-privileged jobs ',
        '(signing an upload, detecting an IP). This is a deliberate simplification, and it ',
        'is also why the security rules in section 7 carry the full weight of ',
        'authorisation.',
      ),
      h2('4.4  Atomicity strategy'),
      para(
        'Multi-document writes are all-or-nothing. A ',
        b('batch'),
        ' applies every write in it or none of them, which is all that booking creation ',
        'needs. A ',
        b('transaction'),
        ' adds reads and re-verification, which the gift card operations require because the ',
        'rules judge a card write against a ledger row that only exists once the write has ',
        'been staged, and a refund has to read both the booking and the card’s current hold ',
        'before it knows what to credit.',
      ),
      bullet(b('Booking creation'), ' — booking document + contract document in one batch.'),
      bullet(
        b('Gift card redemption'),
        ' — booking + contract + card debit + ledger row in one transaction, with the debit ',
        'recorded as a hold. This is what prevents one card funding two bookings, and what ',
        'makes a later release exact.',
      ),
      bullet(b('Gift card issuance'), ' — card document + issued ledger row in one transaction.'),
      bullet(b('Gift card claim and void'), ' — card document + ledger row in one transaction.'),
      para(
        'A write that the rules reject fails as a whole, so a card can never be debited ',
        'without its booking, and a booking can never exist claiming credit that was not ',
        'reserved.',
      ),
    ],
  },

  {
    title: '5. Project Structure',
    blocks: [
      code(
        [
          'app/',
          '  layout.tsx                   Root layout: fonts, metadata, navbar, footer',
          '  page.tsx                     Home: hero, search, featured caravans, map preview',
          '  globals.css                  Tailwind layers + leaflet/prose overrides',
          '  providers.tsx                Auth provider wrapper',
          '  icon.svg                     Favicon',
          '  caravans/page.tsx            Browse page (Suspense-wrapped browser)',
          '  caravans/[id]/page.tsx       Detail page + booking flow',
          '  map/page.tsx                 Full interactive tourism map',
          '  login/page.tsx               Sign-in',
          '  register/page.tsx            Registration',
          '  dashboard/',
          '    page.tsx                   Listings / requests / trips / wallet / gift admin',
          '    caravans/new/page.tsx      Create listing',
          '    caravans/[id]/edit/page.tsx',
          '  api/',
          '    cloudinary/sign/route.ts   Signed-upload endpoint',
          '    ip/route.ts                Client IP detection for contracts',
          '',
          'components/',
          '  caravans/',
          '    CaravanCard.tsx            Listing tile',
          '    CaravanGallery.tsx         Image carousel',
          '    CaravansBrowser.tsx        Filter state + result list',
          '    ImageUploader.tsx          Cloudinary upload with progress',
          '    BookingPanel.tsx           Dates, pricing, gift card entry',
          '    GiftCardRedeemer.tsx       Gift card code entry + live quote',
          '  contract/',
          '    ElectronicContractModal.tsx  Liability agreement + signature flow',
          '  map/',
          '    MapClient.tsx              ssr:false wrapper around the Leaflet map',
          '    AlgeriaMap.tsx             Map container, tiles, markers, fit-bounds',
          '    LocationDrawer.tsx         Selected location detail panel',
          '    types.ts                   Icon registry for markers',
          '  ui/',
          '    Button.tsx, Modal.tsx, form.tsx',
          '  layout/',
          '    Navbar.tsx, Footer.tsx',
          '',
          'lib/',
          '  firebase.ts                  SDK init, lazy auth/db getters, collection names',
          '  types.ts                     All domain interfaces and unions',
          '  constants.ts                 Wilayas, feature lists, status/type metadata',
          '  utils.ts                     Dates, currency, overlap checks, SHA-256',
          '  contract.ts                  Contract template builder + version constant',
          '  cloudinary.ts                Signature fetch + XHR upload helper',
          '  auth-context.tsx             AuthProvider, useAuth, RequireAuth',
          '  services/',
          '    users.ts, caravans.ts, bookings.ts, contracts.ts,',
          '    locations.ts, giftcards.ts',
          '  data/map-seed.ts             16 curated Algerian locations',
          '',
          'scripts/',
          '  generate-docs-pdf.mts        This document’s generator',
          '',
          'firestore.rules                Role-based security rules',
          'firestore.indexes.json         9 composite indexes',
          'firebase.json                  Firebase CLI deploy config',
          '.firebaserc                    Default project binding',
        ].join('\n'),
      ),
    ],
  },

  {
    title: '6. Data Model — Firestore',
    blocks: [
      h2('6.1  users'),
      para('Document ID is the Firebase Auth UID.'),
      table(
        [b('Field'), b('Type'), b('Notes')],
        [
          [m('uid'), t('string'), t('Mirrors the document ID')],
          [m('email'), t('string'), t('')],
          [m('displayName'), t('string'), t('Falls back to email local-part')],
          [m('photoURL'), t('string'), t('Optional')],
          [m('phone'), t('string'), t('Used by owners at handover')],
          [m('role'), t('renter | owner | admin'), t('Drives all authorisations')],
          [m('createdAt'), t('serverTimestamp'), t('')],
        ],
        [0.24, 0.28, 0.48],
      ),

      h2('6.2  caravans'),
      table(
        [b('Field'), b('Type'), b('Notes')],
        [
          [m('ownerId'), t('string'), t('Auth UID; immutable after creation')],
          [m('ownerName, ownerPhone'), t('string'), t('Denormalised for handover')],
          [m('title, description'), t('string'), t('')],
          [m('type'), t('caravan | motorhome | teardrop'), t('')],
          [m('wilaya, commune'), t('string'), t('Algerian administrative divisions')],
          [m('locationGeo'), t('{lat, lng}'), t('Optional')],
          [m('pricePerDay'), t('number'), t('Algerian dinar')],
          [
            m('specs'),
            t('object'),
            p(
              t('capacity, beds, waterTankL, solarPanelW, hasBathroom, '),
              t('hasKitchen, hasAC'),
            ),
          ],
          [m('extras'), t('string[]'), t('Declared equipment')],
          [m('images'), t('{url, publicId}[]'), t('Cloudinary assets')],
          [m('unavailableRanges'), t('{start, end}[]'), t('Owner-blocked periods, epoch ms')],
          [m('published'), t('boolean'), t('Only published listings are publicly readable')],
          [m('createdAt, updatedAt'), t('number'), t('Epoch ms')],
        ],
        [0.26, 0.3, 0.44],
      ),

      h2('6.3  bookings'),
      table(
        [b('Field'), b('Type'), b('Notes')],
        [
          [m('caravanId, caravanTitle'), t('string'), t('Title denormalised so history survives deletion')],
          [m('ownerId, ownerName'), t('string'), t('')],
          [m('renterId, renterName'), t('string'), t('')],
          [m('startDate, endDate'), t('number'), t('Epoch ms')],
          [m('days'), t('number'), t('Derived, stored')],
          [m('pricePerDay, totalPrice'), t('number'), t('Price frozen at time of booking')],
          [m('status'), t('BookingStatus'), t('See section 2.5')],
          [m('message'), t('string'), t('Optional note to owner')],
          [m('contractId'), t('string'), t('FK to contracts')],
          [m('giftCardId, giftCardCode'), t('string'), t('Optional; the card code')],
          [m('giftCardApplied'), t('number'), t('Amount covered by the card')],
          [m('cashDue'), t('number'), t('totalPrice − giftCardApplied')],
          [m('createdAt'), t('number'), t('')],
        ],
        [0.28, 0.24, 0.48],
      ),
      note(
        b('Note: '),
        m('totalPrice'),
        ' always reflects the full rental price shown to the owner. ',
        m('cashDue'),
        ' is what the renter physically hands over. A gift card never reduces what an ',
        'owner is owed; it reduces what the renter pays.',
      ),

      h2('6.4  contracts'),
      para('The evidentiary record of one booking acceptance.'),
      table(
        [b('Field'), b('Type'), b('Notes')],
        [
          [m('bookingId, caravanId'), t('string'), t('')],
          [m('ownerId'), t('string'), t('')],
          [m('userId, userName, userEmail'), t('string'), t('Signing party')],
          [m('fullNameSigned'), t('string'), t('Typed by the renter')],
          [m('ipAddress'), t('string'), t('From /api/ip')],
          [m('userAgent'), t('string'), t('Browser / device fingerprint')],
          [m('contractVersion'), t('string'), t('Template version used')],
          [m('contentHash'), t('string'), t('SHA-256 over version + terms + signature + uid + timestamp')],
          [m('liabilityAcknowledged'), t('boolean'), t('')],
          [m('acceptedAt'), t('number'), t('Epoch ms')],
        ],
        [0.28, 0.2, 0.52],
      ),
      note(
        b('Contracts are append-only'),
        ' — rules permit create and read only, never update or delete.',
      ),

      h2('6.5  giftCards'),
      para(
        b('The document ID is the code itself'),
        ' (',
        m('ZK-XXXX-XXXX-XXXX'),
        '), so validation is a single document read with no collection scan.',
      ),
      table(
        [b('Field'), b('Type'), b('Notes')],
        [
          [m('code'), t('string'), t('Duplicated inside the doc so ledger rows and rules can cross-check it')],
          [m('kind'), t('wallet | voucher'), t('Instrument type')],
          [m('status'), t('active | used | void'), t('')],
          [m('initialAmount'), t('number'), t('Face value, immutable')],
          [m('balance'), t('number'), t('Remaining credit')],
          [m('heldBookingId'), t('string'), t('The booking this card is currently reserved for; null when free')],
          [m('heldAmount'), t('number'), t('How much of the balance that reservation covers')],
          [m('issuedBy, issuedByName'), t('string'), t('Admin UID + display name')],
          [m('recipientUid'), t('string'), t('Set on claim; null while unclaimed')],
          [m('recipientEmail'), t('string'), t('Optional lock to an email address')],
          [m('recipientClaimedAt'), t('number'), t('')],
          [m('note'), t('string'), t('Free-text gift message')],
          [m('caravanId, caravanTitle'), t('string'), t('Vouchers only')],
          [m('startDate, endDate'), t('number'), t('Voucher validity window')],
          [m('expiresAt'), t('number'), t('Optional, both kinds')],
          [m('createdAt'), t('number'), t('')],
          [m('lastUsedAt, lastUsedBy'), t('number, string'), t('Last debit or refund audit trail')],
          [m('voidedAt, voidedBy'), t('number, string'), t('Set by the void operation')],
        ],
        [0.3, 0.26, 0.44],
      ),
      h2('6.6  giftCardLedger'),
      para(
        'Append-only activity trail. Every row is written in the same transaction as the card ',
        'change it describes, and every row has a ',
        b('deterministic document ID'),
        ' so the operation can be replayed safely and verified by the rules:',
      ),
      table(
        [b('Document ID'), b('Operation')],
        [
          [m('issued_{code}'), t('Admin mints a card')],
          [m('claimed_{code}'), t('Recipient attaches the card to their account')],
          [m('applied_{bookingId}'), t('Credit reserved for a booking')],
          [m('released_{bookingId}'), t('Reservation returned after cancel or reject')],
          [m('voided_{code}'), t('Admin voids the card')],
        ],
        [0.42, 0.58],
      ),
      para('Every row is written with every field present, using an empty string where a field does not apply.'),
      table(
        [b('Field'), b('Type'), b('Notes')],
        [
          [m('giftCardId, code'), t('string'), t('Must match the card document ID')],
          [m('kind'), t('issued | claimed | applied | released | voided'), t('')],
          [m('amount'), t('number'), t('Signed. Negative = debit')],
          [m('balanceAfter'), t('number'), t('Running balance snapshot')],
          [m('bookingId'), t('string'), t('For applied / released')],
          [m('note'), t('string'), t('')],
          [m('actorUid'), t('string'), t('Who caused it')],
          [m('createdAt'), t('number'), t('')],
        ],
        [0.28, 0.42, 0.3],
      ),

      h2('6.7  mapLocations'),
      para('Document ID is a stable slug from the seed data, which makes re-seeding idempotent.'),
      table(
        [b('Field'), b('Type'), b('Notes')],
        [
          [m('name, type, wilaya'), t('string'), t('type: national_park | forest | campsite')],
          [m('geo'), t('{lat, lng}'), t('')],
          [m('terrain, water'), t('string'), t('water: potable | seasonal | non_potable | none')],
          [m('safetyNotes'), t('string'), t('')],
          [m('tips'), t('string[]'), t('Practical traveller advice')],
          [m('bestSeason'), t('string'), t('')],
          [m('description'), t('string'), t('')],
        ],
        [0.28, 0.2, 0.52],
      ),

      h2('6.8  Entity relationships'),
      code(
        [
          'users (1) ──< (n) caravans',
          'users (1) ──< (n) bookings      as renterId',
          'users (1) ──< (n) bookings      as ownerId',
          'users (1) ──< (n) contracts     as userId',
          'caravans (1) ──< (n) bookings',
          'bookings (1) ──(1) contracts',
          'bookings (0..1) ──> giftCards   via giftCardCode',
          'giftCards (1) ──< (n) giftCardLedger',
          'users (1) ──< (n) giftCards    via recipientUid',
        ].join('\n'),
      ),
    ],
  },

  {
    title: '7. Security Rules',
    blocks: [
      para(
        'Rules are the only authorisation layer in this application. They are enforced by ',
        'the Firestore backend on every request, so a compromised or modified client ',
        'gains nothing.',
      ),
      h2('7.1  Helper functions'),
      table(
        [b('Function'), b('Returns')],
        [
          [m('isSignedIn()'), m('request.auth != null')],
          [m('userDoc()'), t('The caller’s users/{uid} document')],
          [m('isAdmin()'), p(t('Signed in '), b('and'), t(' role == '), m("'admin'"))],
        ],
        [0.3, 0.7],
      ),
      h2('7.2  Per-collection policy'),
      table(
        [b('Collection'), b('Read'), b('Write')],
        [
          [m('users'), t('Self or admin'), t('Create as renter/owner; self-edit cosmetic fields plus the single renter → owner upgrade; admin role is admin-only; delete admin')],
          [m('caravans'), t('Published, or owner, or admin'), t('Create if ownerId == uid; update/delete if owner or admin')],
          [m('bookings'), t('Renter, owner, or admin'), t('Create if renterId == uid and the totals are arithmetically consistent; owner may change only status, and only to accepted / rejected / completed; renter may only cancel')],
          [m('contracts'), t('Signer, caravan owner, or admin'), t('Create if userId == uid with an acknowledged liability and a non-empty hash; no update or delete')],
          [m('mapLocations'), t('Public'), t('Admin only')],
          [m('giftCards'), t('Admin, recipient by UID, or email-locked holder'), t('Create admin (with the issued row attached); claim by the locked email address; spend or release your own card under the hold rules; anything else admin')],
          [m('giftCardLedger'), t('Admin or holder of the parent card'), t('Append only. Each row must match the card write in the same transaction and use its deterministic document ID')],
        ],
        [0.19, 0.33, 0.48],
      ),
      h2('7.3  The two rules that carry the most weight'),
      h3('Booking status transitions are field-restricted'),
      para(
        'An owner cannot rewrite history. The rule permits a single-field diff:',
      ),
      code(
        [
          'allow update: if isSignedIn() && (',
          '  (',
          '    resource.data.ownerId == request.auth.uid',
          '    && request.resource.data.diff(resource.data)',
          '        .affectedKeys().hasOnly([\'status\'])',
          '  )',
          '  || (',
          '    resource.data.renterId == request.auth.uid',
          '    && request.resource.data.status == \'cancelled\'',
          '    && resource.data.status in [\'pending\', \'accepted\']',
          '  )',
          ');',
        ].join('\n'),
      ),
      para(
        'The second clause means a renter can only ever set ',
        m('cancelled'),
        ', and only from a state they are allowed to withdraw from. Changing ',
        m('totalPrice'),
        ' or ',
        m('renterId'),
        ' is impossible for either party, and the owner is further confined to the three ',
        'statuses an owner actually owns.',
      ),
      h3('A gift card moves in exactly one of three shapes'),
      para(
        'Rather than one permissive "the holder may edit their card" rule, each of the three ',
        'legitimate card writes is its own rule, and each one has to be paired with the ledger ',
        'row that describes it:',
      ),
      code(
        [
          '// claim — a card minted to this email, not yet attached',
          'allow update: if isSignedIn()',
          '  && resource.data.recipientUid == null',
          '  && resource.data.recipientEmail == request.auth.token.email',
          '  && request.resource.data.recipientUid == request.auth.uid',
          '  && request.resource.data.balance == resource.data.balance',
          '  && request.resource.data.diff(resource.data).affectedKeys()',
          '      .hasOnly([\'recipientUid\', \'recipientName\', \'recipientClaimedAt\']);',
          '',
          '// spend — balance only ever falls, and the debit is held',
          'allow update: if isSignedIn()',
          '  && resource.data.recipientUid == request.auth.uid',
          '  && request.resource.data.balance <= resource.data.balance',
          '  && request.resource.data.balance >= 0',
          '  && request.resource.data.heldAmount',
          '      == resource.data.balance - request.resource.data.balance',
          '  && getAfter(ledgerPath(\'applied_\' + request.resource.data.heldBookingId)).data.amount',
          '      == -request.resource.data.heldAmount;',
          '',
          '// release — only a cancelled or rejected booking, only its own hold, only once',
          'allow update: if isSignedIn()',
          '  && get(bookingPath(resource.data.heldBookingId)).data.status',
          '      in [\'cancelled\', \'rejected\']',
          '  && request.resource.data.balance',
          '      == resource.data.balance + resource.data.heldAmount',
          '  && request.resource.data.heldBookingId == null',
          '  && getAfter(ledgerPath(\'released_\' + resource.data.heldBookingId)).data.amount',
          '      == resource.data.heldAmount;',
        ].join('\n'),
      ),
      para(
        'Three properties fall out of that shape. A holder can destroy their own credit but ',
        'never mint any, because every branch that increases the balance is either admin-only ',
        'or is pinned to an amount the card itself recorded. A refund can happen exactly once, ',
        'because it clears the hold. And no balance can move without a matching ledger row, ',
        'because the row is verified against the card write in the same transaction via ',
        m('getAfter'),
        '.',
      ),
      note(
        b('Why this is not simply "deny all ledger writes": '),
        'that variant, which this project used first, is unauditable in practice — the batch ',
        'fails, so minting, claiming, and every redemption break, because a single batch is ',
        'all-or-nothing. Ledger rows are therefore verified rather than forbidden. The rows are ',
        'still immutable: updates and deletes are denied outright.',
      ),
      h3('One card funds one booking at a time'),
      para(
        'A debit records ',
        m('heldBookingId'),
        ' and ',
        m('heldAmount'),
        ' on the card. A second booking would overwrite the hold, so the first reservation ',
        'would become unreleasable. Rather than allowing an ambiguous state, the redemption ',
        'service treats the hold as the card’s single in-flight reservation and the contract ',
        'text instructs the renter to finish or cancel the pending trip before booking the next ',
        'one. This is a deliberate simplification, noted again in section 7.4.',
      ),
      h2('7.4  Known limitations'),
      bullet(
        'Availability conflict checks are advisory. Two owners could accept overlapping ',
        'requests for the same caravan in the same instant. See section 18.',
      ),
      bullet(
        'A gift card reserves credit for one booking at a time, so a second card-funded booking ',
        'would overwrite the first hold. Supporting concurrent reservations needs a per-booking ',
        'hold list, or a server-side re-validation function.',
      ),
      bullet(
        'Ledger rows are verified against the card write they accompany, not against an ',
        'independent source of truth. A trusted function that recomputes balances from the ',
        'ledger remains the strongest available audit.',
      ),
      bullet(
        'Admin role assignment has no self-service path, and this is enforced rather than merely ',
        'absent: a profile can only be created as a renter or owner, and a self-update may only ',
        'move role from renter to owner. The first admin must be written by hand in the console.',
      ),
    ],
  },

  {
    title: '8. Authentication & Roles',
    blocks: [
      h2('8.1  Providers'),
      table(
        [b('Provider'), b('Enabled'), b('Setup location')],
        [
          [t('Email / Password'), t('Required'), t('Console → Authentication → Sign-in method')],
          [t('Google'), t('Required'), t('Same screen; add the authorised domain')],
        ],
        [0.24, 0.16, 0.6],
      ),
      h2('8.2  Role capabilities'),
      table(
        [b('Capability'), b('renter'), b('owner'), b('admin')],
        [
          [t('Browse published listings'), t('yes'), t('yes'), t('yes')],
          [t('Request a booking'), t('yes'), t('yes'), t('yes')],
          [t('View own trips'), t('yes'), t('yes'), t('yes')],
          [t('Use gift cards / wallet'), t('yes'), t('yes'), t('yes')],
          [t('Create & publish listings'), t('—'), t('yes'), t('yes')],
          [t('Accept / reject requests'), t('—'), t('yes'), t('yes')],
          [t('Block availability dates'), t('—'), t('yes'), t('yes')],
          [t('Mint / void gift cards'), t('—'), t('—'), t('yes')],
          [t('Seed map locations'), t('—'), t('—'), t('yes')],
        ],
        [0.46, 0.18, 0.18, 0.18],
      ),
      h2('8.3  Dashboard tabs by role'),
      table(
        [b('Role'), b('Tabs')],
        [
          [m('renter'), t('My trips · Wallet & gift cards')],
          [m('owner'), t('My listings · Booking requests · My trips · Wallet & gift cards')],
          [m('admin'), t('Gift card admin · My listings · Booking requests · My trips · Wallet & gift cards')],
        ],
        [0.2, 0.8],
      ),
      h2('8.4  Account lifecycle'),
      numbered(1, 'User registers or signs in with Google.'),
      numbered(
        2,
        m('ensureUserProfile'),
        ' writes a ',
        m('users/{uid}'),
        ' document on first sight, defaulting ',
        m('role'),
        ' to ',
        m('renter'),
        '.',
      ),
      numbered(
        3,
        'If a Google profile arrives with a name it is written once; an existing name is ',
        'never overwritten.',
      ),
      numbered(
        4,
        'The renter may self-upgrade to ',
        m('owner'),
        '. That is the only role change the rules permit a user to make for themselves; ',
        m('admin'),
        ' is not obtainable from the client.',
      ),
    ],
  },

  {
    title: '9. Electronic Contract System',
    blocks: [
      para('Version constant: ', m('ZAK-DZ-LIABILITY-v1.1')),
      h2('9.1  Purpose'),
      para(
        'Because settlement happens offline, the platform’s legal exposure is mitigated by ',
        'producing a durable, tamper-evident record of what both parties agreed to. The ',
        'template is explicitly a facilitation document: Zackvan is an intermediary, never ',
        'a party to the lease and never a custodian of funds.',
      ),
      h2('9.2  The eleven articles'),
      table(
        [b('#'), b('Article'), b('Substance')],
        [
          [t('1'), t('Parties and Purpose'), t('Identifies owner and tenant; states the intermediary role and no-fund-custody posture')],
          [t('2'), t('Object of the Lease'), t('Names the vehicle, type, declared capacity and extras; tenant accepts condition as described')],
          [t('3'), t('Rental Period, Pickup and Return'), t('Dates, handover location, same-condition return, per-day late compensation')],
          [t('4'), t('Price and Payment'), t('Total price, direct settlement, no escrow. Sub-clause records any gift card applied')],
          [t('5'), t('Tenant Liability'), t('Full legal and financial liability for damage, loss, theft, fire, fines and towing costs')],
          [t('6'), t('Insurance, Deposit, Handover'), t('Deposit and insurance are private arrangements; absence does not reduce Article 5')],
          [t('7'), t('Cancellation and Early Return'), t('Free cancellation pre-acceptance; gift card credit returned on cancel or reject')],
          [t('8'), t('Role of the Platform'), t('Limited to hosting, search and contract facilitation; no warranty, no liability')],
          [t('9'), t('Governing Law'), t('Algerian law, Civil Code lease provisions, courts of the owner’s wilaya')],
          [t('10'), t('Electronic Signature'), t('Law No. 15-04 equivalence, evidentiary value, hash sealing')],
          [t('11'), t('Location Context'), t('Destination wilaya hazards; tenant assesses route feasibility')],
        ],
        [0.06, 0.28, 0.66],
      ),
      h2('9.3  Signature mechanics'),
      numbered(
        1,
        'The renter must tick an explicit acknowledgement of ',
        b('all'),
        ' clauses, with Article 5 called out by name.',
      ),
      numbered(2, 'The renter types their full legal name into a signature field (minimum 3 characters).'),
      numbered(3, m('/api/ip'), ' supplies the public IP, shown live in the evidence panel.'),
      numbered(
        4,
        'A SHA-256 hash is computed over ',
        m('contractVersion | terms | signature | uid | timestamp'),
        '.',
      ),
      numbered(5, 'Booking and contract are written in one all-or-nothing batch.'),
      h2('9.4  Why a hash rather than an immutable document'),
      para(
        'The hash seals the content. Any later alteration of the rendered terms would ',
        'produce a different digest, so the stored value is evidence that the exact text ',
        'shown at signing is the text recorded. Firestore itself provides no document ',
        'immutability and the rules block updates entirely, so the two controls are ',
        'complementary: rules prevent casual tampering, and the hash makes tampering ',
        i('detectable'),
        '.',
      ),
      h2('9.5  Legal basis'),
      para(
        'Algerian ',
        b('Law No. 15-04'),
        ' on electronic signature and certification establishes that a qualified ',
        'electronic document carries the same evidentiary value as a paper instrument. The ',
        'template cites it directly in Article 10. Note that the app’s signature mechanism ',
        'is a typed-name acknowledgement with a sealed hash, not a qualified ',
        'certificate-based signature under the full PKI provisions of the law; that ',
        'distinction should be confirmed by counsel before commercial launch.',
      ),
    ],
  },

  {
    title: '10. Gift Card System',
    blocks: [
      h2('10.1  The central constraint'),
      para(
        'Settlement is off-platform. Therefore a gift card can only ever be a ',
        b('internal accounting instrument'),
        ' that reduces what a renter owes at handover. It never moves money, never creates ',
        'a receivable from an owner, and is never cash-redeemable. This keeps the feature ',
        'entirely outside payment regulation.',
      ),
      h2('10.2  The two instruments'),
      table(
        [b(''), b('Wallet credit'), b('Trip voucher')],
        [
          [b('Scope'), t('Any listing on the platform'), t('One specific caravan')],
          [b('Dates'), t('Any available dates'), t('Must fall inside the voucher window')],
          [b('Partial spend'), t('Yes, remainder carries forward'), t('Yes, remainder carries forward')],
          [b('Best for'), t('Flexible gifts, referral credits, campaigns'), t('Gifting a specific booked trip')],
        ],
        [0.2, 0.4, 0.4],
      ),
      h2('10.3  Code format'),
      para(
        'Pattern ',
        m('ZK-XXXX-XXXX-XXXX'),
        '. Twelve characters drawn from a 32-symbol alphabet that omits ',
        m('0 O 1 I L'),
        ' to remove transcription ambiguity, generated with ',
        m('crypto.getRandomValues'),
        '. The code is also the document ID, so validation is a single ',
        m('getDoc'),
        '.',
      ),
      h2('10.4  Redemption flow'),
      code(
        [
          '1. Renter picks dates on a listing',
          '2. "Have a gift card?" expands → code entered',
          '3. quoteGiftCard() validates:',
          '     · exists · not void · not used · not expired · balance > 0',
          '     · recipient UID is the signed-in account (so the card must already be',
          '       in the wallet — an email-locked card has to be claimed first)',
          '     · if voucher: caravanId matches AND dates inside window',
          '   and returns { applied, cashDue, hint }',
          '4. Booking panel recomputes: total, − applied, = due at handover',
          '   (changing the caravan, dates or price discards the quote)',
          '5. Contract re-renders with the gift card clause in Articles 4 and 7',
          '6. On signing, the quote is re-validated against the live card and the',
          '   contract is hashed over the freshly validated figures',
          '7. One Firestore transaction writes:',
          '     booking      (giftCardApplied, cashDue)',
          '     contract',
          '     giftCards    (balance − applied, status → used if fully spent,',
          '                  heldBookingId, heldAmount = applied)',
          '     ledger       (applied_{bookingId}, negative amount)',
          '8. If the owner rejects, or the renter cancels:',
          '     releaseGiftCardForBooking() returns exactly the held amount and',
          '     clears the hold, so a replay cannot credit twice',
        ].join('\n'),
      ),
      note(
        b('One booking per card at a time. '),
        'The hold occupies the card until the booking is accepted and completed, cancelled, ',
        'or rejected. A second gift-card booking with the same card would overwrite that hold, ',
        'so the booking panel is expected to steer the renter to finish the first trip first.',
      ),
      para(
        'Claiming is a separate, earlier step, and the distinction matters when reading the ',
        'code. Adding a card to the wallet attaches it to an account; it does not spend it. ',
        'The dashboard wallet holds the only claim interface, and the spend rule is written in ',
        'terms of ',
        m('recipientUid'),
        ' rather than the email address, so a card that has been emailed but never claimed ',
        'cannot be used at checkout. When validation hits that case it says so and points the ',
        'renter at the wallet instead of failing the transaction.',
      ),
      h2('10.5  Validation matrix'),
      table(
        [b('Condition'), b('Result')],
        [
          [t('Unknown code'), t('Rejected')],
          [t('Voided'), t('Rejected')],
          [t('Fully used'), t('Rejected')],
          [t('Past expiresAt'), t('Rejected')],
          [t('Zero balance'), t('Rejected')],
          [t('Claimed by a different UID'), t('Rejected')],
          [t('Email-locked to a different address'), t('Rejected')],
          [t('Email-locked and not yet claimed'), t('Rejected at checkout with a prompt to add it to the wallet')],
          [t('Voucher on the wrong caravan'), t('Rejected')],
          [t('Voucher dates outside the window'), t('Rejected')],
          [t('Balance below the trip price'), p(t('Accepted; partial application, renter pays the remainder'))],
        ],
        [0.46, 0.54],
      ),
      h2('10.6  Why the ledger is append-only and verified'),
      para(
        'A mutable ',
        m('balance'),
        ' field alone cannot answer “why does this account show zero?”. Every movement ',
        'is therefore also written as a signed ledger entry carrying ',
        m('balanceAfter'),
        ', so the balance can be reconstructed and audited. Two rules keep the trail honest. ',
        'It is immutable: updates and deletes are denied outright. And each row is verified ',
        'against the card write it accompanies, so the row ID, its amount and its balance ',
        'snapshot all have to agree with the card as it will be after the transaction — a ',
        'row cannot be invented to paper over a balance change.',
      ),
      h2('10.7  Financial semantics'),
      table(
        [b('Situation'), b('Card balance'), b('Owner receives')],
        [
          [t('Booking pending'), t('Debited and held'), t('Nothing yet')],
          [t('Owner rejects'), t('Hold released in full'), t('Nothing')],
          [t('Renter cancels'), t('Hold released in full'), t('Whatever the parties agree offline')],
          [t('Owner accepts'), t('Stays debited'), t('Full totalPrice, settled offline')],
          [t('Trip completed'), t('Stays debited'), t('Full totalPrice')],
          [t('Card voided by admin'), t('Zeroed; any hold is forfeited'), t('Unaffected')],
        ],
        [0.36, 0.28, 0.36],
      ),
      note(
        b('Important: '),
        'the owner is never a party to the gift card. Their payout is ',
        m('totalPrice'),
        ', never ',
        m('cashDue'),
        '. If a renter wins credit and then fails to pay the owner offline, that is a ',
        'private debt between the two — Zackvan has no obligation and no funds. This is ',
        'stated explicitly in Article 4 of the contract.',
      ),
      h2('10.8  Expiry model'),
      para(
        'Expiry is evaluated at read time rather than by a scheduled job. There is no ',
        'background worker to deploy or monitor, and no cron billing. A card past ',
        m('expiresAt'),
        ' fails validation, which is behaviourally identical to being voided, and its ',
        'balance is simply unreachable. If you later want expiry emails or automatic ',
        'refunds, that becomes a Cloud Functions requirement.',
      ),
      h2('10.9  Administrative controls'),
      bullet(
        b('Mint'),
        ' — kind, amount, recipient email (required), optional note, optional expiry; a ',
        'voucher additionally requires a caravan and date window.',
      ),
      bullet(
        b('Void'),
        ' — irreversible, zeroes the balance, writes a voided ledger entry. There is no ',
        'un-void.',
      ),
      bullet(b('List'), ' — every card with remaining vs. face value, recipient, claimed state, and status.'),
      para(
        'Only ',
        m('role: '),
        "'admin'",
        ' may mint or void, and the rules make that binding rather than conventional: a profile ',
        'can only be created as a renter or owner, and a self-service update can only move role ',
        'from renter to owner. To bootstrap the first admin, set ',
        m('users/{uid}.role = \'admin\''),
        ' by hand in the Firestore console.',
      ),
    ],
  },

  {
    title: '11. Cloudinary Image Pipeline',
    blocks: [
      h2('11.1  Why signed uploads'),
      para(
        'Cloudinary offers unsigned uploads, which require only a public API key and an ',
        'upload preset — meaning anyone could upload to the account. This project instead ',
        'signs uploads server-side so the API secret never reaches the browser.',
      ),
      h2('11.2  The signing handshake'),
      code(
        [
          'Browser                          Next.js                     Cloudinary',
          '  │  POST /api/cloudinary/sign     │                             │',
          '  ├──────────────────────────────►  │                             │',
          '  │                                 │ build "folder=…&timestamp=…" │',
          '  │                                 │ sha1( string + API_SECRET )  │',
          '  │  { signature, timestamp,        │                             │',
          '  │    folder, apiKey, cloudName }   │                             │',
          '  │◄──────────────────────────────┤                             │',
          '  │                                                             │',
          '  │  POST /api/v1_1/{cloud}/image/upload  (multipart, signed)    │',
          '  ├────────────────────────────────────────────────────────────►│',
          '  │  { secure_url, public_id }                                  │',
          '  │◄────────────────────────────────────────────────────────────┤',
        ].join('\n'),
      ),
      h2('11.3  Folder restriction'),
      para(
        'The signing route accepts a folder from the request body but only honours it if ',
        'it begins with the configured prefix (',
        m('zakivan/'),
        '). Otherwise it falls back to the server’s configured folder. This prevents a ',
        'client from using your account as arbitrary write-only storage — without it, a ',
        'signed request could target any folder in the product environment.',
      ),
      h2('11.4  Delivery transformations'),
      para('Thumbnails are generated by URL rewriting, not by storing extra derivatives:'),
      code(
        [
          'https://res.cloudinary.com/{cloud}/image/upload/v1/{publicId}.jpg       original',
          '        ↓ rewrite',
          'https://res.cloudinary.com/{cloud}/image/upload/w_800,q_auto,f_auto/…    thumb',
        ].join('\n'),
      ),
      bullet(m('w_800'), ' — bounded width for cards and lists.'),
      bullet(m('q_auto'), ' — automatic quality selection; smaller files with no visible loss.'),
      bullet(m('f_auto'), ' — automatic format negotiation (WebP / AVIF where supported).'),
      para(
        'Both ',
        m('q_auto'),
        ' and ',
        m('f_auto'),
        ' are available on the free plan. Because derivatives are cached at the CDN, a ',
        'repeated request for the same URL is not re-derived and not re-billed — but any ',
        'change to the transformation string produces a new billable derived asset, so ',
        'keep the parameter set stable.',
      ),
      h2('11.5  Storage model'),
      para(
        'Each listing stores an array of ',
        m('{ url, publicId }'),
        '. The ',
        m('publicId'),
        ' is retained specifically so images can be destroyed later; the ',
        m('url'),
        ' alone would not allow it. Note that removing a photo from a listing currently ',
        'only unlinks it from the array — see section 18 for the orphan-cleanup ',
        'recommendation.',
      ),
    ],
  },

  {
    title: '12. Firestore Indexes',
    blocks: [
      para(
        'Firestore indexes single fields automatically, but a query combining an equality ',
        'filter with an ordering or a second filter requires a ',
        b('composite'),
        ' index. Nine are defined in ',
        m('firestore.indexes.json'),
        ' and deployed to the live project.',
      ),
      h2('12.1  bookings'),
      table(
        [b('#'), b('Fields'), b('Serves query')],
        [
          [t('1'), p(m('caravanId'), t(' ASC, '), m('startDate'), t(' ASC')), t('Booking timeline for one caravan')],
          [t('2'), p(m('ownerId'), t(' ASC, '), m('createdAt'), t(' DESC')), t('Owner’s incoming requests')],
          [t('3'), p(m('renterId'), t(' ASC, '), m('createdAt'), t(' DESC')), t('Renter’s trip history')],
          [t('4'), p(m('caravanId'), t(' ASC, '), m('status'), t(' ASC, '), m('endDate'), t(' ASC')), t('Batch availability conflict sweep')],
        ],
        [0.06, 0.44, 0.5],
      ),
      h2('12.2  caravans'),
      table(
        [b('#'), b('Fields'), b('Serves query')],
        [
          [t('5'), p(m('published'), t(' ASC, '), m('createdAt'), t(' DESC')), t('Public browse feed')],
          [t('6'), p(m('ownerId'), t(' ASC, '), m('createdAt'), t(' DESC')), t('Owner’s own listings, unpublished included')],
          [t('7'), p(m('ownerId'), t(' ASC, '), m('published'), t(' ASC, '), m('createdAt'), t(' DESC')), t('Owner’s published listings')],
        ],
        [0.06, 0.44, 0.5],
      ),
      h2('12.3  giftCards and giftCardLedger'),
      table(
        [b('#'), b('Fields'), b('Serves query')],
        [
          [t('8'), p(m('recipientUid'), t(' ASC, '), m('createdAt'), t(' DESC')), t('A user’s cards')],
          [t('9'), p(m('giftCardId'), t(' ASC, '), m('createdAt'), t(' DESC')), t('A card’s activity feed')],
        ],
        [0.06, 0.44, 0.5],
      ),
      para(
        'Two queries deliberately need no composite index. The admin card list is an ',
        m('orderBy'),
        ' on a single field, which Firestore serves from its automatic index; and locating a ',
        'booking’s debit uses the deterministic ledger document ID ',
        m('applied_{bookingId}'),
        ' rather than a three-field filter, so it is a point read.',
      ),
      h2('12.4  Queries that need no index'),
      para('Equality-only queries are served by the automatic single-field indexes:'),
      bullet(m('contracts'), ' where ', m('userId =='), '.'),
      bullet(m('contracts'), ' where ', m('bookingId =='), '.'),
      bullet(m('bookings'), ' where ', m('caravanId =='), ' and ', m('status in […]'), '.'),
      bullet(m('mapLocations'), ' unfiltered collection read.'),
      h2('12.5  Deployment'),
      code('firebase deploy --only firestore:indexes'),
      para(
        'When a query lacks an index, Firestore also returns a console link in the ',
        'browser’s error output; following it opens a pre-filled index creation form.',
      ),
    ],
  },

  {
    title: '13. Map Features',
    blocks: [
      h2('13.1  Stack'),
      para('React-Leaflet 4 with Leaflet 1.9, tiles served from the OpenStreetMap public endpoint:'),
      code('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
      para(
        'No API key, no account, no billing. Attribution to OpenStreetMap contributors is ',
        'declared and the attribution control is enabled.',
      ),
      h2('13.2  SSR constraint'),
      para(
        'Leaflet touches ',
        m('window'),
        ' during module evaluation, which breaks server rendering. ',
        m('MapClient'),
        ' therefore loads the map with ',
        m('ssr: false'),
        ', and the page renders a spinner until the location query resolves. This is why ',
        'the app’s data reads are client-side rather than in Server Components.',
      ),
      h2('13.3  Custom markers'),
      para('Markers are inline SVG divIcons with a CSS class per type — not image sprites or icon fonts.'),
      bullet('Zero extra network requests for marker assets.'),
      bullet('No CDN dependency for icon rendering.'),
      bullet('Colour and size are controlled by CSS classes, trivially restyleable.'),
      bullet(
        'Emphasis for the selected location re-creates the icon instance, keyed on ',
        m('id + selected'),
        ' to force a re-render.',
      ),
      h2('13.4  Data seeding'),
      para(
        'Sixteen curated Algerian locations ship as TypeScript in ',
        m('lib/data/map-seed.ts'),
        '. On the first read of an empty ',
        m('mapLocations'),
        ' collection the client attempts to seed it. That write requires the admin role, ',
        'so for non-admins the seed silently no-ops and the page falls back to rendering ',
        'the bundled data directly — the map is fully functional before Firestore is ever ',
        'populated.',
      ),
      note(
        'This fallback is deliberate. Without it, a permission error during seeding would ',
        'abort the page and show an error instead of the map.',
      ),
      h2('13.5  Tile usage policy'),
      para(
        'The public OSM tile servers are acceptable for development and low traffic, but ',
        'are not intended for heavy production use. If traffic grows, replace the ',
        m('url'),
        ' prop with MapTiler, Mapbox, Stadia, or a self-hosted tile server; only that one ',
        'string changes.',
      ),
      h2('13.6  Interaction details'),
      table(
        [b('Behaviour'), b('Implementation')],
        [
          [t('Initial framing'), t('Auto-fit bounds over Algeria, padded')],
          [t('Pan containment'), t('maxBounds with 0.7 viscosity, extended a few degrees')],
          [t('Deep-link to selection'), t('Fly-to animation on selection change')],
          [t('Interactive vs preview'), p(t('Zoom, drag, scroll, double-click, touch and keyboard '), t('toggled by a prop so the home page preview can disable them'))],
        ],
        [0.32, 0.68],
      ),
    ],
  },

  {
    title: '14. Environment Variables',
    blocks: [
      para(
        'Held in ',
        m('.env.local'),
        ', which is git-ignored. Two prefixes matter: ',
        m('NEXT_PUBLIC_'),
        ' values are inlined into the browser bundle, everything else stays server-side.',
      ),
      h2('14.1  Firebase (public)'),
      table(
        [b('Variable'), b('Visibility'), b('Notes')],
        [
          [m('NEXT_PUBLIC_FIREBASE_API_KEY'), t('Client'), t('Identifies the project. Not a secret — access is governed by rules')],
          [m('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'), t('Client'), m('zakivan-79cce.firebaseapp.com')],
          [m('NEXT_PUBLIC_FIREBASE_PROJECT_ID'), t('Client'), m('zakivan-79cce')],
          [m('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'), t('Client'), t('Present for completeness; media uses Cloudinary')],
          [m('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'), t('Client'), t('')],
          [m('NEXT_PUBLIC_FIREBASE_APP_ID'), t('Client'), t('')],
        ],
        [0.4, 0.16, 0.44],
      ),
      h2('14.2  Cloudinary'),
      table(
        [b('Variable'), b('Visibility'), b('Notes')],
        [
          [m('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'), t('Client'), p(m('dvljsghr0'), t('; appears in delivery URLs, not sensitive'))],
          [m('NEXT_PUBLIC_CLOUDINARY_API_KEY'), t('Client'), t('Public key; only useful with a valid signature')],
          [m('CLOUDINARY_API_SECRET'), b('Server only'), t('Signs uploads. Never exposed. Rotate if it ever leaks')],
          [m('NEXT_PUBLIC_CLOUDINARY_FOLDER'), t('Client'), p(t('Default '), m('zakivan/caravans'), t('; must match the server’s allowed prefix'))],
        ],
        [0.4, 0.16, 0.44],
      ),
      h2('14.3  Secret handling'),
      bullet(m('.env.local'), ' and ', m('.env*.local'), ' are git-ignored.'),
      bullet('The Cloudinary secret is read only inside ', m('POST /api/cloudinary/sign'), '.'),
      bullet('No Firebase Admin SDK and no service account key exists in the repository.'),
      bullet(
        'The Firebase web API key is a public identifier by design; Firestore access is ',
        'authorised by rules, not by the key.',
      ),
    ],
  },

  {
    title: '15. Setup & Deployment',
    blocks: [
      h2('15.1  Local development'),
      code(
        [
          'npm install',
          'cp .env.example .env.local     # then fill in the values',
          'npm run dev                    # http://localhost:3000',
        ].join('\n'),
      ),
      para(
        'Other scripts: ',
        m('npm run build'),
        ' for a production build, ',
        m('npm run start'),
        ' to serve it, ',
        m('npx tsc --noEmit'),
        ' for a type check.',
      ),
      h2('15.2  Firebase project configuration'),
      numbered(1, 'Web app created in project ', m('zakivan-79cce'), '; config copied into env vars.'),
      numbered(2, 'Authentication providers enabled: Email/Password and Google.'),
      numbered(3, 'Firestore created in production mode.'),
      numbered(4, 'Composite indexes deployed.'),
      numbered(5, 'Security rules deployed.'),
      h2('15.3  Deploy commands'),
      code(
        [
          'firebase deploy --only firestore:rules',
          'firebase deploy --only firestore:indexes',
          'firebase deploy --only firestore:rules,firestore:indexes   # both',
        ].join('\n'),
      ),
      para(
        'Bound to the project via ',
        m('.firebaserc'),
        '; deploy targets declared in ',
        m('firebase.json'),
        '.',
      ),
      h2('15.4  Bootstrapping the first admin'),
      numbered(1, 'Register normally through the app.'),
      numbered(
        2,
        'Copy the UID from the Firebase console, or read it from the browser console via ',
        m('getAuth(getApp()).currentUser.uid'),
        '.',
      ),
      numbered(3, 'In Firestore, open ', m('users/{uid}'), ' and set ', m('role'), ' to ', m('"admin"'), '.'),
      numbered(4, 'Reload the dashboard; the ', b('Gift card admin'), ' tab appears.'),
      note(
        'There is intentionally no UI path to assign this role, and the rules enforce that: a ',
        'self-service profile update is limited to cosmetic fields plus the renter → owner ',
        'step, so ',
        m('role: admin'),
        ' can only be written by an admin.',
      ),
      h2('15.5  Cloudinary configuration'),
      numbered(1, 'Note the cloud name on the Settings → Account page.'),
      numbered(2, 'Copy the API key and API secret from Settings → API Keys.'),
      numbered(3, 'Place all three into ', m('.env.local'), '.'),
      para(
        'No unsigned upload preset is required, because uploads are signed. The ',
        m('zakivan/caravans'),
        ' folder is created automatically on first upload.',
      ),
      h2('15.6  Manual map seeding'),
      para(
        'Open ',
        m('/map'),
        ' while signed in as an admin. The client seeds ',
        m('mapLocations'),
        ' on first read of an empty collection. Afterwards the collection is served from ',
        'Firestore.',
      ),
    ],
  },

  {
    title: '16. User Journeys',
    blocks: [
      h2('16.1  Renter: browse to booked'),
      code(
        [
          'Home → search widget (wilaya, dates, guests, type)',
          '     → /caravans results, filtered client-side',
          '     → listing detail: gallery, specs, extras, map context',
          '     → Booking panel: pick dates → live price',
          '     → (optional) apply gift card → see applied + cash due',
          '     → sign contract (tick + type name + IP shown)',
          '     → booking created pending; ledger debited if a card was used',
          '     → Dashboard → My trips → track status',
          '     → owner accepts → renter may cancel until completion',
        ].join('\n'),
      ),
      h2('16.2  Renter: redeem a gifted card'),
      code(
        [
          'Gift received (email or message) with code ZK-XXXX-XXXX-XXXX',
          '  → Dashboard → Wallet & gift cards',
          '  → paste code → Redeem',
          '  → email must match the account',
          '  → card attaches to the account (recipientUid set)',
          '  → appears under "My cards" with remaining balance',
          '  → future bookings can draw on it',
        ].join('\n'),
      ),
      h2('16.3  Owner: list and manage'),
      code(
        [
          'Register → Dashboard → "Become an owner"',
          '  → Add caravan: photos upload straight to Cloudinary with progress',
          '  → set specs, extras, price, wilaya',
          '  → publish when ready',
          '  → Dashboard → My listings → edit / delete / manage availability',
          '  → Booking requests: accept or reject',
          '      · reject releases any gift card reservation',
          '  → accepted → Mark completed after the trip',
        ].join('\n'),
      ),
      h2('16.4  Admin: issue gift cards'),
      code(
        [
          'Dashboard → Gift card admin',
          '  → choose Wallet credit or Trip voucher',
          '  → amount, recipient email (required), optional note, optional expiry',
          '  → voucher: pick a listing + validity window',
          '  → Create → code generated and shown',
          '  → List shows all cards with remaining balance and status',
          '  → Void to invalidate (irreversible)',
        ].join('\n'),
      ),
    ],
  },

  {
    title: '17. Operations Runbook',
    blocks: [
      h2('17.1  Routine checks'),
      table(
        [b('Cadence'), b('Check'), b('Where')],
        [
          [t('Weekly'), t('Pending request age'), t('Dashboard → Booking requests')],
          [t('Weekly'), t('Gift card liability outstanding'), t('Dashboard → Gift card admin (sum of remaining balances)')],
          [t('Monthly'), t('Cloudinary usage vs. plan'), t('Cloudinary console → Account')],
          [t('Monthly'), t('Firestore reads and stored bytes'), t('Firebase console → Usage')],
          [t('Per release'), t('Rules & index deploy'), m('firebase deploy --only firestore')],
        ],
        [0.16, 0.4, 0.44],
      ),
      h2('17.2  Financial exposure to monitor'),
      para(
        'The sum of all active ',
        m('balance'),
        ' values in ',
        m('giftCards'),
        ' is a contingent liability, not cash: it represents future reductions of amounts ',
        'renters owe owners. Since owners are paid the full price offline, a large ',
        'outstanding balance is an operational risk only in the sense that renters may have ',
        '“paid” with credit and then fail to settle with the owner privately. Monitor ',
        'card-funded pending bookings closely.',
      ),
      h2('17.3  Common issues'),
      table(
        [b('Symptom'), b('Likely cause'), b('Resolution')],
        [
          [t('Map shows “Could not load map locations”'), t('Seed write denied (not admin), or an unreadable collection'), t('Non-admins now get bundled fallback data. If it persists, inspect the collection')],
          [t('Query fails with “requires an index”'), t('Missing composite index'), t('Follow the console link, or add to firestore.indexes.json and deploy')],
          [t('“Gift card admin” tab missing'), t('User role is not admin'), p(t('Set '), m("users/{uid}.role = 'admin'"), t(' in the console'))],
          [t('A minted code is “not recognised”'), t('The card was written under a random ID instead of its code'), t('Void it and mint again; codes are now document IDs')],
          [t('Redemption is rejected with a permission error'), t('The booking, card and ledger writes must land in one transaction'), t('Keep the three writes together; a partial retry will not satisfy the rules')],
          [t('Refund does not appear after a cancel'), t('No hold on the card, or the booking was never card-funded'), t('Check heldBookingId on the card and released_{bookingId} in the ledger')],
          [t('“Cloudinary is not configured on the server”'), t('Missing server env var'), t('Check the three Cloudinary values in .env.local')],
          [t('Upload rejects the folder'), t('Folder outside the allowed prefix'), p(t('Keep the folder under '), m('zakivan/'))],
          [t('Permission denied writing a booking'), t('Contract create requires userId == uid'), t('Sign in; unauthenticated requests cannot create')],
          [t('Contract tampering suspected'), t('—'), t('Recompute SHA-256 over version, terms, signature, uid, timestamp and compare with contentHash')],
        ],
        [0.28, 0.3, 0.42],
      ),
      h2('17.4  Rotation procedure'),
      para(
        'If the Cloudinary API secret is ever exposed, rotate it in the Cloudinary console ',
        'and update ',
        m('CLOUDINARY_API_SECRET'),
        '. Existing signatures expire naturally because they embed a timestamp, so the ',
        'impact window is minutes. If the Firebase web API key leaks, no rotation is ',
        'needed — it is public by design and rules are the real control.',
      ),
    ],
  },

  {
    title: '18. Production Roadmap',
    blocks: [
      h2('18.1  High priority'),
      table(
        [b('Item'), b('Rationale')],
        [
          [t('Transactional availability re-check'), t('Conflict detection today runs client-side before submission. Under concurrency two owners could accept overlapping dates. A Cloud Function should re-validate overlaps inside a transaction at booking creation.')],
          [t('Cloudinary orphan cleanup'), t('Removing a photo only unlinks it from the listing, while the asset keeps costing storage and transformations. A scheduled function should reconcile listings against stored public IDs and destroy the difference.')],
          [t('Gift card abuse monitoring'), t('Alert on cards with rapid issue-and-redeem cycles and on balances never used. Consider a per-account issuance cap.')],
          [t('Gift card balance re-derivation'), t('The rules verify each ledger row against the card write it accompanies, which is strong but still client-driven. A Cloud Function recomputing balances from the ledger would make the ledger, not the client, the source of truth, and could also lift the one-booking-per-card-at-a-time restriction.')],
          [t('Contract PDF export'), t('The contract is currently only rendered in-app. Emitting a signed PDF for renter and owner would materially strengthen the evidentiary position.')],
        ],
        [0.3, 0.7],
      ),
      h2('18.2  Medium priority'),
      table(
        [b('Item'), b('Rationale')],
        [
          [t('Server-side reads for SEO routes'), t('Client-only fetching keeps listings out of search results. Migrating browse and detail to Server Components with force-dynamic would make them indexable.')],
          [t('Notifications'), t('Email or push on request, acceptance and rejection. Today the owner must open the dashboard to discover new work.')],
          [t('Pagination'), t('Browse and dashboard cap at 200 records. Beyond that, add cursor pagination.')],
          [t('Reviews and ratings'), t('No trust signal exists on listings yet. Given the weight of Article 5, owner history matters.')],
          [t('Multi-currency display'), t('Prices are DZD-only. A EUR reference rate would help diaspora renters.')],
        ],
        [0.3, 0.7],
      ),
      h2('18.3  Lower priority'),
      bullet('Wishlists and price alerts.'),
      bullet('Owner payout reporting and tax export.'),
      bullet('Seasonal demand analytics per wilaya.'),
      bullet('Gift card bulk import for corporate or campaign use.'),
      bullet('Offline map tiles for remote Saharan destinations, where connectivity is unreliable.'),
      h2('18.4  Deliberately excluded'),
      bullet(
        b('Online payment capture'),
        '. Would introduce fund custody and the regulatory burden the current design ',
        'deliberately avoids.',
      ),
      bullet(
        b('Gift card expiry automation'),
        '. Read-time evaluation is sufficient until there are enough cards to justify a ',
        'scheduled job.',
      ),
      bullet(
        b('Escrow'),
        '. Same reasoning; contracts, not custody, are the risk control.',
      ),
    ],
  },

  {
    title: '19. Legal & Compliance Notes',
    blocks: [
      note(
        'This section records what the code does and the reasoning behind it. It is not ',
        'legal advice. Have counsel review before commercial launch.',
      ),
      h2('19.1  Data protection'),
      table(
        [b('Data'), b('Collected'), b('Basis / control')],
        [
          [t('Contract acceptance'), t('Full legal name, IP, user agent, timestamp'), t('Contract performance; evidenced by explicit tick plus typed signature')],
          [t('Profile'), t('Email, display name, phone, photo'), t('Account operation; phone is used for handover coordination')],
          [t('Listings'), t('Vehicle description, photos, location'), t('Published by the owner intentionally')],
        ],
        [0.22, 0.3, 0.48],
      ),
      para(
        'At time of writing the application records no consent checkbox for data ',
        'processing, sets no retention period, and offers no account deletion or data-export ',
        'path. For Algerian users, Law No. 18-07 on personal data protection is the governing ',
        'regime. Three additions are advisable before launch: an explicit consent record, a ',
        'retention policy for contract evidence, and a self-service account deletion path ',
        'that anonymises rather than erases the contract record.',
      ),
      h2('19.2  Contract enforceability'),
      para(
        'The template cites ',
        b('Law No. 15-04'),
        ' for the equivalence of electronic and paper instruments. Two caveats:',
      ),
      numbered(
        1,
        'The signature is a typed-name acknowledgement sealed with a hash, not a qualified ',
        'certificate signature under a trusted PKI. Whether that satisfies 15-04’s formal ',
        'requirements in a given dispute is a question for counsel.',
      ),
      numbered(
        2,
        'Article 5’s full-liability language and Article 9’s jurisdiction clause should be ',
        'reviewed for fairness and enforceability under Algerian consumer law, ',
        'particularly where the tenant is a consumer rather than a business.',
      ),
      h2('19.3  Gift cards as an instrument'),
      para(
        'Because gift cards never touch money and never reduce an owner’s payout, they are ',
        'best characterised as promotional credit rather than stored value. Two consequences:',
      ),
      bullet(
        b('No cash redemption, ever.'),
        ' Article 7 and the checkout UI both state this. It is the main protection against ',
        'the instrument being treated as stored value.',
      ),
      bullet(
        b('Expiry.'),
        ' Unrestricted perpetual credit would raise abandoned-balance and accounting ',
        'questions. Expiry is available per card, though not enforced by a job.',
      ),
      h2('19.4  Platform liability posture'),
      para(
        'Article 8 disclaims warranty as to vehicle condition and liability for bodily ',
        'injury, material damage and financial loss. Combined with the absence of escrow and ',
        'fund custody, the platform is structured as an information intermediary. Note that ',
        'such disclaimers are not absolute: under Algerian law liability cannot be excluded ',
        'for intentional misconduct, and consumer protection rules may restrict exclusion of ',
        'warranty for hidden defects. This posture is a reasonable starting point, not a shield.',
      ),
      h2('19.5  Map data accuracy'),
      para(
        'Coordinates, terrain, water availability and safety notes in ',
        m('lib/data/map-seed.ts'),
        ' are curated starting points for a demo, not verified cartography. They are ',
        'rendered in the UI as traveller guidance, including safety information. Before ',
        'launch, each entry should be field-verified, dated and sourced, and a disclaimer ',
        'that the information is indicative and unverified should be visible in the drawer.',
      ),
      h2('19.6  Cloudinary and content'),
      para(
        'Owners upload their own photography. Confirm that a reported or disputed image can ',
        'be removed from the delivery CDN, and establish a takedown contact. Because assets ',
        'are served from Cloudinary rather than the application origin, takedown must happen ',
        'at the media provider.',
      ),
    ],
  },

  {
    title: 'Appendix A — Launch Checklist',
    blocks: [
      h2('A.1  Firebase'),
      code(
        [
          '[ ] Email/Password sign-in provider enabled',
          '[ ] Google sign-in provider enabled, authorised domain added',
          '[ ] Firestore created in production mode',
          '[ ] Security rules deployed:  firebase deploy --only firestore:rules',
          '[ ] Composite indexes deployed: firebase deploy --only firestore:indexes',
          '[ ] /map opened once as admin to seed mapLocations',
          '[ ] First admin role assigned in the console',
        ].join('\n'),
      ),
      h2('A.2  Cloudinary'),
      code(
        [
          '[ ] Cloud name copied into NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
          '[ ] API key copied into NEXT_PUBLIC_CLOUDINARY_API_KEY',
          '[ ] API secret copied into CLOUDINARY_API_SECRET (server only)',
          '[ ] Folder prefix kept under zakivan/',
          '[ ] One test upload completed end to end',
        ].join('\n'),
      ),
      h2('A.3  Application'),
      code(
        [
          '[ ] .env.local present and git-ignored',
          '[ ] npm run build succeeds',
          '[ ] npx tsc --noEmit clean',
          '[ ] Branding shows Zackvan everywhere',
          '[ ] Test booking completed with and without a gift card',
          '[ ] Test card rejection returns the balance',
        ].join('\n'),
      ),
    ],
  },
];

/* ------------------------------------------------------------------- main */

const outDir = process.cwd();
mkdirSync(outDir, { recursive: true });
const filePath = join(outDir, 'Zackvan-Documentation.pdf');

const pdf = new Renderer().render(SPECS);
writeFileSync(filePath, Buffer.from(pdf.output('arraybuffer')));

console.log(`Wrote ${filePath} (${pdf.getNumberOfPages()} pages)`);
