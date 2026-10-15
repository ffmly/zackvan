'use client';

import { CheckCircle2, Download, FileSignature, Loader2, MapPin, ShieldCheck, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Checkbox, Input } from '@/components/ui/form';
import Button from '@/components/ui/Button';
import { buildContractTerms, CONTRACT_VERSION } from '@/lib/contract';
import { collection, doc } from 'firebase/firestore';
import { COLLECTIONS, getDb as getDbForClient } from '@/lib/firebase';
import type { Caravan, ContractRecord, UserProfile } from '@/lib/types';
import { formatDZD, formatDate, sha256Hex, shortId } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  caravan: Caravan;
  renter: UserProfile;
  startDate: number;
  endDate: number;
  days: number;
  totalPrice: number;
  giftCardCode?: string;
  giftCardApplied?: number;
  cashDue?: number;
  message?: string;
  onSuccess: (bookingId: string) => void;
}

export default function ElectronicContractModal({
  open,
  onClose,
  caravan,
  renter,
  startDate,
  endDate,
  days,
  totalPrice,
  giftCardCode,
  giftCardApplied,
  cashDue,
  message,
  onSuccess,
}: Props) {
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const [ip, setIp] = useState<string>('…');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const terms = useMemo(
    () =>
      buildContractTerms({
        caravan,
        renterName: renter.displayName,
        startDate,
        endDate,
        days,
        totalPrice,
        giftCardCode,
        giftCardApplied,
        cashDue,
      }),
    [
      caravan,
      renter.displayName,
      startDate,
      endDate,
      days,
      totalPrice,
      giftCardCode,
      giftCardApplied,
      cashDue,
    ],
  );

  useEffect(() => {
    if (!open) {
      setAccepted(false);
      setSignature('');
      setError(null);
      setSubmitting(false);
      return;
    }
    fetch('/api/ip')
      .then((r) => r.json())
      .then((d: { ip?: string }) => setIp(d.ip ?? 'unavailable'))
      .catch(() => setIp('unavailable'));
  }, [open]);

  const signatureValid = signature.trim().length >= 3;

  async function downloadContractPdf() {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const left = 18;
    const width = 174;
    let y = 20;

    pdf.setTextColor(48, 41, 31);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Zackvan Algeria', left, y);
    y += 9;
    pdf.setFontSize(13);
    pdf.text('Electronic Rental Agreement', left, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Contract version ${CONTRACT_VERSION}`, left, y);
    y += 10;

    const summary = [
      `Tenant: ${renter.displayName}`,
      `Owner: ${caravan.ownerName}`,
      `Caravan: ${caravan.title}`,
      `Period: ${formatDate(startDate)} - ${formatDate(endDate)} (${days} day(s))`,
      `Total: ${formatDZD(giftCardApplied && giftCardApplied > 0 ? (cashDue ?? totalPrice) : totalPrice)}`,
      ...(giftCardApplied && giftCardApplied > 0 ? [`Gift card applied: ${formatDZD(giftCardApplied)}`] : []),
      ...(signature.trim() ? [`Signed by: ${signature.trim()}`] : ['Status: Draft preview']),
    ];
    pdf.setFontSize(10);
    summary.forEach((line) => { pdf.text(line, left, y); y += 5.5; });
    y += 5;

    for (const section of terms) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      const heading = pdf.splitTextToSize(section.title, width);
      if (y + heading.length * 5 + 10 > 280) { pdf.addPage(); y = 20; }
      pdf.text(heading, left, y);
      y += heading.length * 5 + 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      for (const paragraph of section.body) {
        const lines = pdf.splitTextToSize(paragraph, width);
        if (y + lines.length * 4.5 + 6 > 280) { pdf.addPage(); y = 20; }
        pdf.text(lines, left, y, { lineHeightFactor: 1.35 });
        y += lines.length * 4.5 + 5;
      }
    }

    pdf.setFontSize(8);
    pdf.setTextColor(110, 100, 85);
    pdf.text('Zackvan Algeria is a technical intermediary and holds no booking funds.', left, 290);
    pdf.save(`zackvan-contract-${shortId(bookingId ?? caravan.id)}.pdf`);
  }

  async function handleSign() {
    if (!accepted || !signatureValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      // The figure shown in the modal is a quote, not a commitment. Re-check it
      // against the live card before anything is sealed, so the stored contract
      // can never describe a credit that was not actually reserved.
      let appliedCredit = 0;
      let dueAtHandover = totalPrice;
      let signedTerms = terms;

      if (giftCardCode) {
        const { quoteGiftCard } = await import('@/lib/services/giftcards');
        const fresh = await quoteGiftCard(giftCardCode, {
          uid: renter.uid,
          email: renter.email,
          caravanId: caravan.id,
          startDate,
          endDate,
          totalPrice,
        });
        if (fresh.applied <= 0) {
          throw new Error(
            'That gift card no longer has any balance to apply. Close this window, remove the card, and try again.',
          );
        }
        appliedCredit = fresh.applied;
        dueAtHandover = fresh.cashDue;
        signedTerms = buildContractTerms({
          caravan,
          renterName: renter.displayName,
          startDate,
          endDate,
          days,
          totalPrice,
          giftCardCode,
          giftCardApplied: appliedCredit,
          cashDue: dueAtHandover,
        });
      }

      const acceptedAt = Date.now();
      const contentHash = await sha256Hex(
        [
          CONTRACT_VERSION,
          JSON.stringify(signedTerms),
          signature.trim(),
          renter.uid,
          String(acceptedAt),
        ].join('|'),
      );

      const { signContractAndCreateBooking } = await import('@/lib/services/contracts');
      const contract: Omit<ContractRecord, 'id' | 'acceptedAt' | 'bookingId'> = {
        caravanId: caravan.id,
        ownerId: caravan.ownerId,
        userId: renter.uid,
        userName: renter.displayName,
        userEmail: renter.email,
        fullNameSigned: signature.trim(),
        ipAddress: ip,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        contractVersion: CONTRACT_VERSION,
        contentHash,
        liabilityAcknowledged: true,
      };

      const draftBooking = {
        caravanId: caravan.id,
        caravanTitle: caravan.title,
        ownerId: caravan.ownerId,
        ownerName: caravan.ownerName,
        renterId: renter.uid,
        renterName: renter.displayName,
        ...(renter.phone?.trim() ? { renterPhone: renter.phone.trim() } : {}),
        startDate,
        endDate,
        days,
        pricePerDay: caravan.pricePerDay,
        totalPrice,
        status: 'pending' as const,
        ...(message?.trim() ? { message: message.trim() } : {}),
      };

      let id: string;
      if (giftCardCode && appliedCredit > 0) {
        const { redeemGiftCardAndCreateBooking } = await import(
          '@/lib/services/giftcards'
        );
        const db = getDbForClient();
        const result = await redeemGiftCardAndCreateBooking({
          bookingRef: doc(collection(db, COLLECTIONS.bookings)),
          contractRef: doc(collection(db, COLLECTIONS.contracts)),
          booking: draftBooking,
          contract: contract as unknown as Record<string, unknown>,
          cardCode: giftCardCode,
          uid: renter.uid,
        });
        id = result.bookingId;
      } else {
        const { signContractAndCreateBooking } = await import(
          '@/lib/services/contracts'
        );
        id = await signContractAndCreateBooking(draftBooking, contract);
      }

      setBookingId(id);
      onSuccess(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit your request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      size="xl"
      closeOnOverlay={!submitting && !bookingId}
      title={
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <FileSignature className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">
              Electronic Rental Agreement
            </p>
            <p className="text-xs text-slate-400">
              Contract version {CONTRACT_VERSION} · Legally binding under Algerian law
            </p>
          </div>
        </div>
      }
    >
      {bookingId ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-brand-700" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">
            Booking request submitted
          </h3>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Your signed agreement and booking request have been recorded.
            Reference <span className="font-mono font-semibold">{shortId(bookingId)}</span>.
            The owner will review and confirm your dates shortly.
          </p>
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" onClick={() => void downloadContractPdf()}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Link
              href="/dashboard?tab=trips"
              className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Track my trips
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Tenant</p>
              <p className="truncate text-sm font-semibold text-slate-800">{renter.displayName}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Owner</p>
              <p className="truncate text-sm font-semibold text-slate-800">{caravan.ownerName}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Period</p>
              <p className="text-sm font-semibold text-slate-800">
                {formatDate(startDate)} → {formatDate(endDate)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {giftCardApplied && giftCardApplied > 0 ? 'Due at handover' : 'Total'}
              </p>
              <p className="text-sm font-semibold text-brand-700">
                {formatDZD(
                  giftCardApplied && giftCardApplied > 0
                    ? (cashDue ?? totalPrice)
                    : totalPrice,
                )}
              </p>
            </div>
          </div>

          {giftCardApplied && giftCardApplied > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm">
              <span className="font-medium text-brand-800">
                Gift card {giftCardCode} applied
              </span>
              <span className="font-bold text-brand-800">
                −{formatDZD(giftCardApplied)}
              </span>
            </div>
          )}

          <div className="scrollbar-thin max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-5 legal-prose">
            {terms.map((section) => (
              <section key={section.title}>
                <h4>{section.title}</h4>
                {section.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => void downloadContractPdf()}>
              <Download className="h-4 w-4" /> Download contract PDF
            </Button>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Liability acknowledgement — Article 5
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                  By signing below you accept full legal and financial liability
                  for any damage, loss, or accidents affecting the caravan during
                  the rental period. Payments are settled directly with the owner;
                  Zackvan Algeria holds no funds.
                </p>
              </div>
            </div>
          </div>

          <Checkbox
            checked={accepted}
            onChange={setAccepted}
            label={
              <span>
                I confirm I have read and accept{' '}
                <strong>all clauses</strong> of this contract, including the full
                liability assumption of Article&nbsp;5.
              </span>
            }
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="contract-signature" className="mb-1.5 block text-sm font-medium text-slate-700">
                Digital signature — type your full legal name
              </label>
              <Input
                id="contract-signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Ex: Amine Benali"
                autoComplete="off"
                className="font-serif italic"
              />
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              <p className="flex items-center gap-1 font-semibold text-slate-600">
                <MapPin className="h-3 w-3" /> Evidence log
              </p>
              IP: <span className="font-mono">{ip}</span>
              <br />
              Time: {new Date().toLocaleString('en-GB')}
              <br />
              Device fingerprint sealed via SHA-256 hash.
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <Button
            onClick={handleSign}
            disabled={!accepted || !signatureValid}
            loading={submitting}
            size="lg"
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sealing contract…
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" /> Sign &amp; submit booking request
              </>
            )}
          </Button>
          {!accepted && (
            <p className="-mt-2 text-center text-xs text-slate-400">
              Tick the confirmation box to enable signing.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
