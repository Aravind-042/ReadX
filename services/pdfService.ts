// @ts-nocheck
import { Block } from '../types';

// Improved processPdf: positional text extraction, column detection, header/footer removal, hyphen-merging, heading detection.
//
// Requires pdfjsLib available in browser context (same as your current code).
// Usage: const result = await processPdf(file);

declare const pdfjsLib: any;

type TextItem = {
  str: string;
  x: number;
  y: number;
  fontSize: number;
  width?: number;
  raw: any;
};

export const processPdf = async (file: File) : Promise<{
  pages: { pageIndex: number; blocks: Block[] }[],
  coverImage: string,
  title: string,
  author: string
}> => {
  const fileReader = new FileReader();

  function getTransformXY(item: any) {
    // pdf.js text item transform matrix: [a, b, c, d, e, f]
    // e (transform[4]) is x, f (transform[5]) is y in PDF units
    // fontSize approximation: item.transform[0] maybe scale; fallback to item.height
    const t = item.transform;
    const x = t[4];
    const y = t[5];
    // try to estimate fontSize from vertical scaling (d) or item.height
    let fontSize = 0;
    if (item.height) fontSize = item.height;
    else if (t && t[0]) fontSize = Math.abs(t[0]);
    else fontSize = 10;
    return { x, y, fontSize };
  }

  function clusterLines(items: TextItem[], yTolerance = 4) : TextItem[][] {
    // Group items into lines by Y coordinate proximity
    // Items expected in page coordinate space (higher y means higher on page depending on PDF coordinate)
    const lines: { y: number; items: TextItem[] }[] = [];
    const sorted = items.slice().sort((a,b) => b.y - a.y || a.x - b.x); // top->bottom
    for (const it of sorted) {
      let placed = false;
      for (const line of lines) {
        if (Math.abs(line.y - it.y) <= yTolerance) {
          line.items.push(it);
          // keep average y as reference
          line.y = (line.y * (line.items.length - 1) + it.y) / line.items.length;
          placed = true;
          break;
        }
      }
      if (!placed) {
        lines.push({ y: it.y, items: [it] });
      }
    }
    // sort items inside line by x ascending
    return lines.map(l => l.items.sort((a,b)=>a.x - b.x));
  }

  function detectColumns(items: TextItem[], pageWidth: number) : {mode: 'single'|'two', separators?: number[]} {
    // build histogram of x positions to find whether two-column exists
    const xs = items.map(i => i.x);
    if (xs.length < 10) return {mode: 'single'};
    xs.sort((a,b)=>a-b);
    // get simple two-cluster via kmeans-like split: try split at mid and compute variance
    const mid = Math.floor(xs.length/2);
    const left = xs.slice(0, mid);
    const right = xs.slice(mid);
    const leftMean = left.reduce((s,v)=>s+v,0)/left.length;
    const rightMean = right.reduce((s,v)=>s+v,0)/right.length;
    // if gap between leftMean and rightMean is significant relative to page width -> two columns
    if ((rightMean - leftMean) > pageWidth * 0.2) {
      return { mode: 'two', separators: [ (leftMean + rightMean)/2 ] };
    }
    return { mode: 'single' };
  }

  function removeHeadersFootersAcrossPages(pageTopLines: string[][], pageBottomLines: string[][]) {
    // pageTopLines[i] = array of top-3 lines for page i (strings)
    // pageBottomLines similar
    const topCandidates: Record<string, number> = {};
    const bottomCandidates: Record<string, number> = {};
    const pages = pageTopLines.length;
    for (let i=0;i<pages;i++){
      const top = pageTopLines[i] || [];
      top.forEach(t => { if (!t) return; topCandidates[t] = (topCandidates[t]||0)+1 });
      const bot = pageBottomLines[i] || [];
      bot.forEach(t => { if (!t) return; bottomCandidates[t] = (bottomCandidates[t]||0)+1 });
    }
    const topRemove = new Set<string>();
    const bottomRemove = new Set<string>();
    const threshold = Math.max(2, Math.floor(pages * 0.65)); // appear on >=65% pages
    for (const [k,v] of Object.entries(topCandidates)) if (v>=threshold) topRemove.add(k);
    for (const [k,v] of Object.entries(bottomCandidates)) if (v>=threshold) bottomRemove.add(k);
    return { topRemove, bottomRemove };
  }

  function normalizeWhitespace(s: string) {
    return s.replace(/\u00A0/g,' ').replace(/[ \t]+/g,' ').trim();
  }

  function isBulletToken(s: string) {
    if (!s) return false;
    return /^\u2022|^•|^[-*]|^\d+\./.test(s.trim());
  }

  // Main reader
  return new Promise((resolve, reject) => {
    fileReader.onload = async (ev) => {
      try {
        const typed = new Uint8Array(ev.target.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typed).promise;
        const pagesResult: { pageIndex:number; blocks: Block[] }[] = [];
        const pageTopLines: string[][] = [];
        const pageBottomLines: string[][] = [];

        const allItemsForMedian: TextItem[] = [];
        for (let p=1; p<=pdf.numPages; p++) {
             const page = await pdf.getPage(p);
             const textContent = await page.getTextContent();
             const itemsRaw = textContent.items || [];
             itemsRaw.forEach((it:any) => {
                const { fontSize } = getTransformXY(it);
                allItemsForMedian.push({ str: '', x:0, y:0, fontSize, raw: null });
             });
        }
        const medianDocFontSize = medianFontSize([allItemsForMedian]);

        for (let p=1; p<=pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1 });
          const textContent = await page.getTextContent();
          const itemsRaw = textContent.items || [];

          const items: TextItem[] = itemsRaw.map((it:any) => {
            const { x, y, fontSize } = getTransformXY(it);
            return {
              str: (it.str || '').replace(/\r/g,''),
              x, y, fontSize: Math.round(fontSize),
              width: it.width || undefined,
              raw: it
            };
          }).filter(i => i.str && i.str.trim().length>0);

          if (items.length === 0) {
            pagesResult.push({ pageIndex: p-1, blocks: [{ type: 'paragraph', text: '[scanned-page]' }]});
            pageTopLines.push([]);
            pageBottomLines.push([]);
            continue;
          }

          const colInfo = detectColumns(items, viewport.width || 600);
          const yTolerance = 4;
          const lines = clusterLines(items, yTolerance);

          const top3 = lines.slice(0,3).map(l => normalizeWhitespace(l.map(i => i.str).join(' ')));
          const bottom3 = lines.slice(-3).map(l => normalizeWhitespace(l.map(i => i.str).join(' ')));
          pageTopLines.push(top3);
          pageBottomLines.push(bottom3);

          let pageBlocks: Block[] = [];
          
          const processLinesIntoBlocks = (linesToProcess: TextItem[][]) => {
              let currentParagraph = '';
              const flushParagraph = () => {
                  if (currentParagraph.trim()) {
                      pageBlocks.push({ type: 'paragraph', text: currentParagraph.trim() });
                      currentParagraph = '';
                  }
              };

              linesToProcess.forEach((lineItems, idx) => {
                  const lineText = normalizeWhitespace(lineItems.map(item => item.str).join(' '));
                  if (!lineText) {
                      flushParagraph();
                      return;
                  }

                  const avgFontSize = lineItems.reduce((sum, item) => sum + item.fontSize, 0) / lineItems.length;
                  const isHeading = avgFontSize > medianDocFontSize * 1.15 || isCentered(lineItems, viewport.width);
                  const isListItem = isBulletToken(lineText);

                  if (isHeading) {
                      flushParagraph();
                      pageBlocks.push({ type: 'heading', text: lineText, level: estimateHeadingLevel(avgFontSize, medianDocFontSize) });
                  } else if (isListItem) {
                      flushParagraph();
                      pageBlocks.push({ type: 'list', text: lineText });
                  } else {
                      const endsWithPunctuation = /[.?!:]\s*$/.test(currentParagraph);
                      const startsWithLowerCase = /^[a-z]/.test(lineText);
                      
                      if (currentParagraph && !endsWithPunctuation && startsWithLowerCase) {
                          if (currentParagraph.endsWith('-')) {
                              currentParagraph = currentParagraph.slice(0, -1) + lineText;
                          } else {
                              currentParagraph += ' ' + lineText;
                          }
                      } else {
                          flushParagraph();
                          currentParagraph = lineText;
                      }
                  }
              });
              flushParagraph();
          };

          if (colInfo.mode === 'two') {
            const sep = colInfo.separators![0];
            const leftItems = items.filter(i => i.x < sep);
            const rightItems = items.filter(i => i.x >= sep);
            const leftLines = clusterLines(leftItems, yTolerance);
            const rightLines = clusterLines(rightItems, yTolerance);
            processLinesIntoBlocks(leftLines);
            processLinesIntoBlocks(rightLines);
          } else {
            processLinesIntoBlocks(lines);
          }

          pagesResult.push({pageIndex: p-1, blocks: pageBlocks});
        }

        const { topRemove, bottomRemove } = removeHeadersFootersAcrossPages(pageTopLines, pageBottomLines);
        for (const pr of pagesResult) {
          pr.blocks = pr.blocks.filter(b => {
            const t = normalizeWhitespace(b.text||'');
            if (!t) return false;
            if (topRemove.has(t) || bottomRemove.has(t)) return false;
            return true;
          });
        }

        const coverPage = await pdf.getPage(1);
        const viewport = coverPage.getViewport({ scale: 1 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await coverPage.render({ canvasContext: context, viewport }).promise;
        const coverImage = canvas.toDataURL();

        let title = file.name.replace('.pdf','');
        let author = 'Unknown Author';
        try {
          const md = await pdf.getMetadata();
          if (md && md.info) {
            if (md.info.Title) title = md.info.Title;
            if (md.info.Author) author = md.info.Author;
          }
        } catch(e) { /* ignore */ }

        resolve({ pages: pagesResult, coverImage, title, author });
      } catch (err) {
        reject(err);
      }
    };

    fileReader.onerror = (e) => reject(e);
    fileReader.readAsArrayBuffer(file);
  });

  function medianFontSize(items: TextItem[]) {
    if (items.length === 0) return 10;
    const sizes = items.map(i => i.fontSize).sort((a,b)=>a-b);
    return sizes[Math.floor(sizes.length/2)];
  }

  function isCentered(line: TextItem[], pageWidth:number) {
    if (!line.length) return false;
    const xs = line.map(i=>i.x);
    const minX = Math.min(...xs);
    const lineTextWidth = line.reduce((sum, item) => sum + (item.width || (item.str.length * item.fontSize * 0.6)), 0);
    const centerOfText = minX + lineTextWidth / 2;
    const centerOfPage = pageWidth / 2;
    return Math.abs(centerOfText - centerOfPage) < pageWidth * 0.15 && lineTextWidth < pageWidth * 0.6;
  }

  function estimateHeadingLevel(fontSize:number, medianDocFontSize: number) {
    if (fontSize > medianDocFontSize * 1.6) return 1;
    if (fontSize > medianDocFontSize * 1.25) return 2;
    return 3;
  }
};