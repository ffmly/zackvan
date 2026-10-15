'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import ImageUploader from '@/components/caravans/ImageUploader';
import { Field, Input, Select, Textarea, Toggle } from '@/components/ui/form';
import { useAuth } from '@/lib/auth-context';
import type {
  Caravan,
  CaravanSpecs,
  CaravanType,
  CloudinaryImage,
} from '@/lib/types';
import { CARAVAN_TYPES } from '@/lib/types';
import { EXTRA_FEATURES } from '@/lib/constants';
import { createCaravan, updateCaravan } from '@/lib/services/caravans';
import { WILAYAS } from '@/lib/constants';

interface FormState {
  title: string;
  type: CaravanType;
  description: string;
  wilaya: string;
  commune: string;
  pricePerDay: string;
  capacity: string;
  beds: string;
  waterTankL: string;
  solarPanelW: string;
  hasBathroom: boolean;
  hasKitchen: boolean;
  hasAC: boolean;
  extras: string[];
  ownerPhone: string;
  published: boolean;
  images: CloudinaryImage[];
}

function toForm(caravan?: Caravan): FormState {
  return {
    title: caravan?.title ?? '',
    type: caravan?.type ?? 'caravan',
    description: caravan?.description ?? '',
    wilaya: caravan?.wilaya ?? '',
    commune: caravan?.commune ?? '',
    pricePerDay: caravan ? String(caravan.pricePerDay) : '',
    capacity: caravan ? String(caravan.specs.capacity) : '2',
    beds: caravan ? String(caravan.specs.beds) : '1',
    waterTankL:
      caravan?.specs.waterTankL != null ? String(caravan.specs.waterTankL) : '',
    solarPanelW:
      caravan?.specs.solarPanelW != null ? String(caravan.specs.solarPanelW) : '',
    hasBathroom: caravan?.specs.hasBathroom ?? false,
    hasKitchen: caravan?.specs.hasKitchen ?? true,
    hasAC: caravan?.specs.hasAC ?? false,
    extras: caravan?.extras ?? [],
    ownerPhone: caravan?.ownerPhone ?? '',
    published: caravan?.published ?? false,
    images: caravan?.images ?? [],
  };
}

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters.';
  }
  if (!form.wilaya) errors.wilaya = 'Select a wilaya.';
  const price = Number(form.pricePerDay);
  if (!form.pricePerDay || Number.isNaN(price) || price < 500) {
    errors.pricePerDay = 'Enter a daily price of at least 500 DA.';
  }
  const capacity = Number(form.capacity);
  if (!form.capacity || Number.isNaN(capacity) || capacity < 1) {
    errors.capacity = 'Capacity must be at least 1.';
  }
  if (form.beds === '' || Number.isNaN(Number(form.beds))) {
    errors.beds = 'Enter the number of beds.';
  }
  if (form.images.length === 0) errors.images = 'Add at least one photo.';
  return errors;
}

export default function CaravanForm({ existing }: { existing?: Caravan }) {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(() => toForm(existing));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(toForm(existing)), [existing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const specs: CaravanSpecs = {
        capacity: Number(form.capacity),
        beds: Number(form.beds),
        hasBathroom: form.hasBathroom,
        hasKitchen: form.hasKitchen,
        hasAC: form.hasAC,
        ...(form.waterTankL ? { waterTankL: Number(form.waterTankL) } : {}),
        ...(form.solarPanelW ? { solarPanelW: Number(form.solarPanelW) } : {}),
      };

      const base = {
        title: form.title.trim(),
        type: form.type,
        description: form.description.trim(),
        wilaya: form.wilaya,
        ...(form.commune.trim() ? { commune: form.commune.trim() } : {}),
        pricePerDay: Number(form.pricePerDay),
        specs,
        extras: form.extras,
        ownerPhone: form.ownerPhone.trim(),
        published: form.published,
        images: form.images,
      };

      let id: string;
      if (existing) {
        id = existing.id;
        await updateCaravan(id, base);
      } else {
        if (!user) throw new Error('You must be signed in to create a listing.');
        id = await createCaravan({
          ...base,
          ownerId: user.uid,
          ownerName: user.displayName,
          unavailableRanges: [],
        });
      }
      router.push('/dashboard');
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Failed to save listing.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {existing ? 'Edit caravan' : 'List your caravan'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Detailed listings get booked faster. Photos are stored and optimized on
          Cloudinary.
        </p>
      </div>

      {serverError && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">Basics</h2>
        <Field label="Listing title" htmlFor="cf-title" required error={errors.title}>
          <Input
            id="cf-title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Cozy 4-person caravan with solar"
            maxLength={90}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Vehicle type" htmlFor="cf-type" required>
            <Select
              id="cf-type"
              value={form.type}
              onChange={(e) => set('type', e.target.value as CaravanType)}
            >
              {CARAVAN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Daily price (DA)" htmlFor="cf-price" required error={errors.pricePerDay}>
            <Input
              id="cf-price"
              type="number"
              min={500}
              step={100}
              value={form.pricePerDay}
              onChange={(e) => set('pricePerDay', e.target.value)}
              placeholder="8000"
            />
          </Field>
          <Field label="Wilaya" htmlFor="cf-wilaya" required error={errors.wilaya}>
            <Select
              id="cf-wilaya"
              value={form.wilaya}
              onChange={(e) => set('wilaya', e.target.value)}
            >
              <option value="">Select wilaya</option>
              {WILAYAS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Commune / area"
          htmlFor="cf-commune"
          hint="Shown publicly; the exact meeting point stays between you and renters."
        >
          <Input
            id="cf-commune"
            value={form.commune}
            onChange={(e) => set('commune', e.target.value)}
            placeholder="Ex: Aokas"
          />
        </Field>

        <Field label="Description" htmlFor="cf-desc">
          <Textarea
            id="cf-desc"
            rows={5}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What makes your caravan special? Routes, sleeping layout, equipment condition…"
            maxLength={2000}
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">Specifications</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Sleeping capacity" htmlFor="cf-capacity" required error={errors.capacity}>
            <Input
              id="cf-capacity"
              type="number"
              min={1}
              max={12}
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
            />
          </Field>
          <Field label="Beds" htmlFor="cf-beds" required error={errors.beds}>
            <Input
              id="cf-beds"
              type="number"
              min={0}
              max={8}
              value={form.beds}
              onChange={(e) => set('beds', e.target.value)}
            />
          </Field>
          <Field label="Water tank (liters)" htmlFor="cf-water">
            <Input
              id="cf-water"
              type="number"
              min={0}
              value={form.waterTankL}
              onChange={(e) => set('waterTankL', e.target.value)}
              placeholder="e.g. 100"
            />
          </Field>
          <Field label="Solar panel (watts)" htmlFor="cf-solar">
            <Input
              id="cf-solar"
              type="number"
              min={0}
              value={form.solarPanelW}
              onChange={(e) => set('solarPanelW', e.target.value)}
              placeholder="e.g. 200"
            />
          </Field>
          <Field
            label="Your contact phone"
            htmlFor="cf-phone"
            hint="Only shared after a contract is signed."
          >
            <Input
              id="cf-phone"
              type="tel"
              value={form.ownerPhone}
              onChange={(e) => set('ownerPhone', e.target.value)}
              placeholder="+213 …"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Toggle checked={form.hasBathroom} onChange={(v) => set('hasBathroom', v)} label="Onboard bathroom" />
          <Toggle checked={form.hasKitchen} onChange={(v) => set('hasKitchen', v)} label="Kitchen" />
          <Toggle checked={form.hasAC} onChange={(v) => set('hasAC', v)} label="Air conditioning" />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Extra equipment
          </legend>
          <div className="flex flex-wrap gap-2">
            {EXTRA_FEATURES.map((extra) => {
              const active = form.extras.includes(extra);
              return (
                <button
                  key={extra}
                  type="button"
                  onClick={() =>
                    set(
                      'extras',
                      active
                        ? form.extras.filter((x) => x !== extra)
                        : [...form.extras, extra],
                    )
                  }
                  className={
                    active
                      ? 'rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white'
                      : 'rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200'
                  }
                >
                  {extra}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-bold text-slate-900">Photos</h2>
        <p className="mb-4 text-sm text-slate-500">
          First photo becomes the cover image.
        </p>
        {errors.images && (
          <p className="mb-3 text-sm font-medium text-rose-600">{errors.images}</p>
        )}
        <ImageUploader value={form.images} onChange={(images) => set('images', images)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Toggle
          checked={form.published}
          onChange={(v) => set('published', v)}
          label="Publish this listing immediately (visible in search)"
        />
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          <Save className="h-4 w-4" />
          {existing ? 'Save changes' : 'Create listing'}
        </Button>
      </div>
    </form>
  );
}
