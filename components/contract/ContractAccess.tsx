'use client';

import { Download, Eye, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { buildContractTerms, CONTRACT_VERSION } from '@/lib/contract';
import type { Booking, Caravan, ContractRecord } from '@/lib/types';
import { formatDate, formatDZD, shortId } from '@/lib/utils';

type Props = {
  booking: Booking;
  caravan: Caravan;
  contract: ContractRecord;
  compact?: boolean;
};

export default function ContractAccess({ booking, caravan, contract, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const terms = useMemo(() => buildContractTerms({
    caravan,
    renterName: booking.renterName,
    startDate: booking.startDate,
    endDate: booking.endDate,
    days: booking.days,
    totalPrice: booking.totalPrice,
    giftCardCode: booking.giftCardCode,
    giftCardApplied: booking.giftCardApplied,
    cashDue: booking.cashDue,
  }), [booking, caravan]);

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const left = 18;
    const width = 174;
    let y = 20;
    const write = (text: string, size = 9, bold = false) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, width);
      if (y + lines.length * (size * 0.55) + 8 > 280) { pdf.addPage(); y = 20; }
      pdf.text(lines, left, y);
      y += lines.length * (size * 0.55) + 4;
    };
    write('Zackvan Algeria', 18, true);
    write('Electronic Rental Agreement', 13, true);
    write(`Contract ${shortId(contract.id ?? booking.contractId ?? booking.id)} · Version ${contract.contractVersion || CONTRACT_VERSION}`);
    y += 3;
    [
      `Tenant: ${booking.renterName}${booking.renterPhone ? ` · ${booking.renterPhone}` : ''}`,
      `Owner: ${booking.ownerName}`,
      `Caravan: ${booking.caravanTitle}`,
      `Period: ${formatDate(booking.startDate)} – ${formatDate(booking.endDate)} (${booking.days} day${booking.days === 1 ? '' : 's'})`,
      `Total: ${formatDZD(booking.totalPrice)} · Due at handover: ${formatDZD(booking.cashDue)}`,
      `Signed by: ${contract.fullNameSigned} on ${formatDate(contract.acceptedAt)}`,
    ].forEach((line) => write(line, 10));
    y += 2;
    terms.forEach((section) => {
      write(section.title, 11, true);
      section.body.forEach((paragraph) => write(paragraph));
    });
    pdf.setTextColor(110, 100, 85);
    write(`Evidence hash: ${contract.contentHash}`, 8);
    pdf.save(`zackvan-contract-${shortId(contract.id ?? booking.id)}.pdf`);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size={compact ? 'sm' : 'md'} variant="outline" onClick={() => setOpen(true)}>
          <Eye className="h-4 w-4" /> View contract
        </Button>
        <Button size={compact ? 'sm' : 'md'} variant="subtle" onClick={() => void downloadPdf()}>
          <Download className="h-4 w-4" /> PDF
        </Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} size="xl" title={<span className="flex items-center gap-2"><FileText className="h-5 w-5 text-brand-700" /> Signed rental contract</span>}>
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm sm:grid-cols-2">
            <p><strong>Tenant:</strong> {booking.renterName}{booking.renterPhone ? ` · ${booking.renterPhone}` : ''}</p>
            <p><strong>Signed:</strong> {contract.fullNameSigned}</p>
            <p><strong>Dates:</strong> {formatDate(booking.startDate)} → {formatDate(booking.endDate)}</p>
            <p><strong>Total:</strong> {formatDZD(booking.totalPrice)}</p>
          </div>
          <div className="scrollbar-thin max-h-[52vh] space-y-4 overflow-y-auto rounded-xl border border-slate-200 p-5 legal-prose">
            {terms.map((section) => <section key={section.title}><h4>{section.title}</h4>{section.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>)}
          </div>
          <div className="flex justify-end"><Button variant="outline" onClick={() => void downloadPdf()}><Download className="h-4 w-4" /> Download PDF</Button></div>
        </div>
      </Modal>
    </>
  );
}
