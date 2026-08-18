import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import type { BusinessDocumentModel, DocumentParty } from "@/lib/documents/model";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit") as typeof import("pdfkit");
const geistFontPath = join(
  process.cwd(),
  "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf",
);
const geistFont = readFileSync(geistFontPath);

const colours = {
  brand: "#2563EB",
  border: "#CBD5E1",
  muted: "#475569",
  pale: "#F1F5F9",
  text: "#0F172A",
  white: "#FFFFFF",
};
const pageMargin = 54;
const contentBottom = 755;
const contentWidth = 595.28 - pageMargin * 2;

export function formatDocumentMoney(amount: number) {
  return new Intl.NumberFormat("en-NZ", {
    currency: "NZD",
    currencyDisplay: "code",
    style: "currency",
  }).format(amount);
}

export function formatDocumentDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeZone: "Pacific/Auckland",
  }).format(date);
}

function formatStatus(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getDocumentTitle(document: BusinessDocumentModel) {
  return document.kind === "quote" ? "QUOTE" : "INVOICE";
}

function getDocumentReference(document: BusinessDocumentModel) {
  return document.number?.trim() || document.id.slice(0, 8).toUpperCase();
}

function getCustomerLines(customer: DocumentParty | null) {
  if (!customer) {
    return ["No customer assigned"];
  }

  return [
    customer.name,
    customer.companyName,
    customer.email,
    customer.phone,
    customer.address,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function getBusinessLines(document: BusinessDocumentModel) {
  return [
    document.business.companyName,
    document.business.ownerName,
    document.business.email,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > contentBottom) {
    doc.addPage();
  }
}

function drawSectionHeading(doc: PDFKit.PDFDocument, heading: string) {
  ensureSpace(doc, 34);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(colours.muted)
    .text(heading.toUpperCase(), pageMargin, doc.y, {
      characterSpacing: 0.8,
      width: contentWidth,
    });
  doc.moveDown(0.7);
}

function drawHeader(doc: PDFKit.PDFDocument, document: BusinessDocumentModel) {
  const title = getDocumentTitle(document);
  const reference = getDocumentReference(document);

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(colours.white);
  doc.rect(0, 0, doc.page.width, 8).fill(colours.brand);
  doc
    .font("Geist")
    .fontSize(18)
    .fillColor(colours.brand)
    .text(document.business.companyName, pageMargin, 48, {
      width: 300,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor(colours.text)
    .text(title, 350, 46, {
      align: "right",
      width: 191,
    });
  doc
    .font("Geist")
    .fontSize(10)
    .fillColor(colours.muted)
    .text(reference, 350, 82, { align: "right", width: 191 });
  doc
    .font("Geist")
    .fontSize(10)
    .fillColor(colours.text)
    .text(`Status: ${formatStatus(document.status)}`, 350, 100, {
      align: "right",
      width: 191,
    });
  doc
    .moveTo(pageMargin, 128)
    .lineTo(doc.page.width - pageMargin, 128)
    .lineWidth(1)
    .strokeColor(colours.border)
    .stroke();
  doc.y = 150;
}

function drawContinuationHeader(
  doc: PDFKit.PDFDocument,
  document: BusinessDocumentModel,
) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(colours.white);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(colours.muted)
    .text(
      `${getDocumentTitle(document)} | ${getDocumentReference(document)}`,
      pageMargin,
      32,
      { align: "right", width: contentWidth },
    );
  doc
    .moveTo(pageMargin, 50)
    .lineTo(doc.page.width - pageMargin, 50)
    .lineWidth(0.75)
    .strokeColor(colours.border)
    .stroke();
  doc.y = 66;
}

function drawDateSummary(
  doc: PDFKit.PDFDocument,
  document: BusinessDocumentModel,
) {
  const entries =
    document.kind === "quote"
      ? [
          ["Issue date", formatDocumentDate(document.issuedAt)],
          ["Accepted date", formatDocumentDate(document.acceptedAt)],
        ]
      : [
          ["Issue date", formatDocumentDate(document.issuedAt)],
          ["Due date", formatDocumentDate(document.dueAt)],
          [
            "Paid date",
            document.status === "paid"
              ? formatDocumentDate(document.paidAt)
              : "Not paid",
          ],
          ["Source quote", document.sourceQuoteNumber || "Not linked"],
        ];
  const columnWidth = contentWidth / entries.length;
  const y = doc.y;

  entries.forEach(([label, value], index) => {
    const x = pageMargin + columnWidth * index;
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(colours.muted)
      .text(label.toUpperCase(), x, y, { width: columnWidth - 12 });
    doc
      .font("Geist")
      .fontSize(10)
      .fillColor(colours.text)
      .text(value, x, y + 16, { width: columnWidth - 12 });
  });
  doc.y = y + 54;
}

function drawParties(doc: PDFKit.PDFDocument, document: BusinessDocumentModel) {
  drawSectionHeading(doc, document.kind === "quote" ? "Prepared for" : "Bill to");
  const columnWidth = (contentWidth - 30) / 2;
  const customerText = getCustomerLines(document.customer).join("\n");
  const businessText = getBusinessLines(document).join("\n");

  doc.font("Geist").fontSize(10).fillColor(colours.text);
  const customerHeight = doc.heightOfString(customerText, { width: columnWidth });
  const businessHeight = doc.heightOfString(businessText, { width: columnWidth });
  ensureSpace(doc, Math.max(customerHeight, businessHeight) + 34);
  const contentY = doc.y;

  doc.text(customerText, pageMargin, contentY, {
    lineGap: 3,
    width: columnWidth,
  });
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(colours.muted)
    .text("FROM", pageMargin + columnWidth + 30, contentY - 20, {
      characterSpacing: 0.8,
      width: columnWidth,
    });
  doc
    .font("Geist")
    .fontSize(10)
    .fillColor(colours.text)
    .text(businessText, pageMargin + columnWidth + 30, contentY, {
      lineGap: 3,
      width: columnWidth,
    });
  doc.y = contentY + Math.max(customerHeight, businessHeight) + 28;
}

function drawJob(doc: PDFKit.PDFDocument, document: BusinessDocumentModel) {
  if (!document.job) {
    return;
  }

  drawSectionHeading(doc, "Job");
  doc
    .font("Geist")
    .fontSize(11)
    .fillColor(colours.text)
    .text(document.job.title, pageMargin, doc.y, {
      width: contentWidth,
    });

  if (document.job.address) {
    doc
      .fontSize(9)
      .fillColor(colours.muted)
      .text(document.job.address, pageMargin, doc.y + 5, {
        width: contentWidth,
      });
  }

  doc.moveDown(1.2);
}

function drawDescription(doc: PDFKit.PDFDocument, document: BusinessDocumentModel) {
  const description = document.job?.description?.trim();

  if (!description) {
    return;
  }

  drawSectionHeading(doc, "Work description");
  doc
    .font("Geist")
    .fontSize(10)
    .fillColor(colours.text)
    .text(description, pageMargin, doc.y, {
      lineGap: 4,
      paragraphGap: 7,
      width: contentWidth,
    });
  doc.moveDown(1.5);
}

function drawTotal(doc: PDFKit.PDFDocument, document: BusinessDocumentModel) {
  ensureSpace(doc, 92);
  const y = doc.y;

  doc
    .roundedRect(pageMargin, y, contentWidth, 74, 8)
    .fillAndStroke(colours.pale, colours.border);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colours.muted)
    .text("TOTAL", pageMargin + 18, y + 18, { width: 120 });
  doc
    .font("Geist")
    .fontSize(20)
    .fillColor(colours.text)
    .text(formatDocumentMoney(document.amount), pageMargin + 170, y + 15, {
      align: "right",
      width: contentWidth - 188,
    });
  doc
    .font("Geist")
    .fontSize(8)
    .fillColor(colours.muted)
    .text(
      "Stored document total in New Zealand dollars.",
      pageMargin + 18,
      y + 48,
      { width: contentWidth - 36 },
    );
  doc.y = y + 94;
}

function drawFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .moveTo(pageMargin, doc.page.height - 52)
      .lineTo(doc.page.width - pageMargin, doc.page.height - 52)
      .lineWidth(0.5)
      .strokeColor(colours.border)
      .stroke();
    doc
      .font("Geist")
      .fontSize(8)
      .fillColor(colours.muted)
      .text(
        `Generated by PipeFlow | Page ${index + 1} of ${range.count}`,
        pageMargin,
        doc.page.height - 40,
        { align: "center", lineBreak: false, width: contentWidth },
      );
    doc.page.margins.bottom = bottomMargin;
  }
}

export async function renderBusinessDocumentPdf(
  document: BusinessDocumentModel,
): Promise<Uint8Array> {
  const title = `${getDocumentTitle(document)} ${getDocumentReference(document)}`;
  const doc = new PDFDocument({
    bufferPages: true,
    compress: true,
    info: {
      Author: document.business.companyName,
      Creator: "PipeFlow",
      Subject: `${getDocumentTitle(document)} PDF export`,
      Title: title,
    },
    margins: {
      bottom: 62,
      left: pageMargin,
      right: pageMargin,
      top: pageMargin,
    },
    size: "A4",
  });
  const chunks: Buffer[] = [];

  doc.registerFont("Geist", geistFont);
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  doc.on("pageAdded", () => drawContinuationHeader(doc, document));

  const output = new Promise<Uint8Array>((resolve, reject) => {
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);
  });

  drawHeader(doc, document);
  drawDateSummary(doc, document);
  drawParties(doc, document);
  drawJob(doc, document);
  drawDescription(doc, document);
  drawTotal(doc, document);
  drawFooters(doc);
  doc.end();

  return output;
}
