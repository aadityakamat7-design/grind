import { jsPDF } from "jspdf";

// Renders the Verified Work Record as a clean, professional PDF in Blockwork's
// brand: white page, navy text, the Blockwork wordmark, and a QR code that
// opens the public verification page.
//
// The QR image comes from the free goqr.me endpoint (no key, no cost). If it
// can't be loaded — offline, blocked, or a CORS hiccup — the PDF still renders
// with the verification link in plain text.

const NAVY = [28, 36, 51];
const BLUE = [29, 91, 219];
const AMBER = [245, 161, 30];
const GREY = [110, 118, 132];

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

function verificationUrl(recordId) {
  return `https://blockwork.online/verify/${recordId}`;
}

async function qrDataUrl(text) {
  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&data=${encodeURIComponent(text)}`;
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildWorkRecordPdf(record) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 56;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Header band ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 96, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Blockwork", margin, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Verified Work Record", margin, 68);
  doc.setFontSize(9);
  doc.setTextColor(200, 210, 225);
  doc.text(`Record ID ${record.record_id}`, pageW - margin, 46, { align: "right" });
  doc.text(
    `Generated ${new Date(record.generated_at || Date.now()).toLocaleDateString("en-US")}`,
    pageW - margin,
    62,
    { align: "right" },
  );
  y = 140;

  // ── Who ──
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(record.teen_display_name || "Blockwork teen", margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text(
    [record.city, record.state].filter(Boolean).join(", ") || "California",
    margin,
    y,
  );
  y += 26;

  // ── Totals ──
  const totals = [
    { label: "Jobs completed", value: String(record.jobs_completed || 0) },
    { label: "Hours worked", value: `${record.hours_total || 0}` },
    { label: "Average rating", value: record.avg_rating ? `${Number(record.avg_rating).toFixed(1)} / 5` : "—" },
  ];
  const boxW = (contentW - 24) / 3;
  totals.forEach((t, i) => {
    const x = margin + i * (boxW + 12);
    doc.setFillColor(246, 247, 250);
    doc.roundedRect(x, y, boxW, 66, 8, 8, "F");
    doc.setTextColor(...GREY);
    doc.setFontSize(9);
    doc.text(t.label.toUpperCase(), x + 14, y + 24);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(t.value, x + 14, y + 48);
    doc.setFont("helvetica", "normal");
  });
  y += 92;

  // ── Every job approved by a parent ──
  doc.setFillColor(240, 246, 255);
  doc.roundedRect(margin, y, contentW, 30, 8, 8, "F");
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Every job approved by a parent", margin + 14, y + 20);
  doc.setFont("helvetica", "normal");
  y += 56;

  // ── Categories ──
  if (record.categories?.length) {
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Work categories", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text(record.categories.map((c) => c.replace(/_/g, " ")).join("  ·  "), margin, y);
    y += 28;
  }

  // ── Job history ──
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Completed jobs", margin, y);
  y += 14;
  doc.setDrawColor(225, 228, 234);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text("DATE", margin, y);
  doc.text("JOB", margin + 80, y);
  doc.text("HOURS", pageW - margin - 90, y, { align: "right" });
  y += 14;
  doc.setTextColor(...NAVY);

  const jobs = record.jobs || [];
  if (jobs.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text("No completed jobs yet.", margin, y + 6);
    y += 24;
  } else {
    jobs.forEach((job) => {
      if (y > 690) {
        doc.addPage();
        y = 72;
      }
      doc.setFontSize(10);
      doc.text(job.date || "", margin, y);
      doc.text(String(job.title || "Job").slice(0, 42), margin + 80, y);
      doc.text(String(job.hours ?? ""), pageW - margin - 90, y, { align: "right" });
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.text(job.neighbor_label || "Neighbor", margin + 80, y + 11);
      doc.setTextColor(...NAVY);
      y += 26;
    });
  }

  // ── Reviews ──
  if (record.reviews?.length) {
    if (y > 620) {
      doc.addPage();
      y = 72;
    }
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("What neighbors said", margin, y);
    y += 20;
    doc.setFont("helvetica", "normal");
    record.reviews.forEach((r) => {
      if (y > 700) {
        doc.addPage();
        y = 72;
      }
      doc.setFontSize(10);
      doc.setTextColor(...AMBER);
      doc.text(`${r.rating}/5`, margin, y);
      doc.setTextColor(...NAVY);
      const lines = doc.splitTextToSize(`"${r.quote}"`, contentW - 60);
      doc.setFontSize(9);
      doc.text(lines.slice(0, 3), margin + 40, y);
      y += Math.min(3, lines.length) * 12 + 12;
    });
  }

  // ── Verification block ──
  if (y > 560) {
    doc.addPage();
    y = 72;
  }
  y += 16;
  doc.setDrawColor(225, 228, 234);
  doc.line(margin, y, pageW - margin, y);
  y += 26;

  const url = verificationUrl(record.record_id);
  const qr = await qrDataUrl(url);
  if (qr) {
    try {
      doc.addImage(qr, "PNG", margin, y, 96, 96);
    } catch {
      /* fall through to the text-only verification block */
    }
  }

  const textX = qr ? margin + 116 : margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Verify this record", textX, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(
    doc.splitTextToSize(
      "Anyone can confirm these numbers are real — a school, a coach, or an employer — by opening the link below. " +
        "The teen or their parent can turn this link off at any time.",
      contentW - (qr ? 116 : 0),
    ),
    textX,
    y + 36,
  );
  doc.setTextColor(...BLUE);
  doc.setFontSize(9);
  doc.text(url, textX, y + (qr ? 82 : 74));

  y += 136;
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text(
    "Verified by Blockwork. Every job on this record was completed through Blockwork, approved by the teen's parent, " +
      "and paid out. Neighborhood names and addresses are never included.",
    margin,
    y,
    { maxWidth: contentW },
  );
  doc.text(`Record ID ${record.record_id} · blockwork.online`, margin, y + 26);

  const safeName = String(record.teen_display_name || "work-record").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`blockwork-work-record-${safeName}.pdf`);
}

export { verificationUrl };