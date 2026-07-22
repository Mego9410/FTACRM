"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, MapPin, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { PracticeMap } from "@/components/practices/practice-map";
import { removePracticeHeadline, uploadPracticeHeadline } from "@/app/(app)/practices/headline-actions";

export function PracticeHeadline({
  practiceId,
  imageUrl,
  lat,
  lng,
}: {
  practiceId: string;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("practice_id", practiceId);
    fd.set("file", file);
    const res = await uploadPracticeHeadline(fd);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await removePracticeHeadline({ id: practiceId });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative h-64 overflow-hidden rounded-xl border border-line bg-surface-2 sm:h-72 lg:h-auto lg:aspect-[4/5]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Practice headline" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface via-surface-2 to-gold-tint/40 p-3">
          <PracticeMap lat={lat} lng={lng} className="max-h-full w-auto" />
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[13px] font-semibold text-fg-1 shadow-sm backdrop-blur transition-colors hover:bg-surface"
      >
        <Pencil size={13} /> {imageUrl ? "Change photo" : "Add photo"}
      </button>

      {!imageUrl ? (
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-semibold text-fg-3 backdrop-blur">
          <MapPin size={12} className="text-gold-deep" /> Auto-generated location map
        </span>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} title="Headline image">
        <div className="space-y-4">
          <p className="text-sm text-fg-2">
            Add a photo of the practice to show at the top of its record. With no photo, a map with a pin at the
            practice's location is shown instead.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="gap-1.5">
              {imageUrl ? <Upload size={14} /> : <ImagePlus size={14} />}
              {busy ? "Uploading…" : imageUrl ? "Upload a new photo" : "Upload a photo"}
            </Button>
            {imageUrl ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()} className="gap-1.5 text-danger">
                <Trash2 size={14} /> Remove — use the map
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-fg-4">JPG, PNG, WebP or GIF, up to 10 MB.</p>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
