import { db } from "@/lib/supabase/admin";
import { rand } from "@/lib/format";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import NumberField from "@/components/ui/NumberField";
import { deleteLessonType, saveLessonType } from "../actions";
import type { LessonType } from "@/lib/types";

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { data } = await db().from("lesson_types").select("*").order("sort_order");
  const lessons = (data ?? []) as LessonType[];

  return (
    <div className="max-w-3xl">
      <Flash error={sp.error} success={sp.saved && "Saved."} />
      <h2 className="h-display text-3xl">Private lesson types</h2>
      <p className="mb-4 text-sm text-slate-600">What clients can choose on the booking page. Hidden types can&apos;t be booked but keep their history.</p>

      <div className="space-y-3">
        {lessons.map((l) => (
          <details key={l.id} className="card group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold">{l.name} {!l.active && <span className="badge ml-2 bg-slate-200 text-slate-600">Hidden</span>}</p>
                <p className="text-sm text-slate-500">{l.duration_minutes} min · {rand(l.price_cents)}</p>
              </div>
              <span className="text-sm font-semibold text-brand-600 group-open:hidden">Edit</span>
            </summary>
            <div className="border-t border-slate-100 p-4">
              <LessonForm l={l} />
              <form action={deleteLessonType} className="mt-3">
                <input type="hidden" name="id" value={l.id} />
                <ConfirmButton
                  title={`Delete “${l.name}”?`}
                  message="Clients won't be able to book it any more. If it already has bookings it's hidden instead, so your history is kept."
                  className="text-sm font-semibold text-red-600 hover:underline"
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </details>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <p className="mb-3 font-bold">Add a lesson type</p>
        <LessonForm />
      </div>
    </div>
  );
}

function LessonForm({ l }: { l?: LessonType }) {
  return (
    <form action={saveLessonType} className="grid gap-3 sm:grid-cols-6">
      {l && <input type="hidden" name="id" value={l.id} />}
      <div className="sm:col-span-6"><label className="label">Name</label><input name="name" className="input" defaultValue={l?.name} required placeholder="Private Lesson - 60 min" /></div>
      <div className="sm:col-span-6"><label className="label">Description</label><input name="description" className="input" defaultValue={l?.description ?? ""} /></div>
      <div className="sm:col-span-2"><label className="label">Duration (min)</label><NumberField name="duration_minutes" min={15} max={240} step={15} buttonStep={15} suffix="min" defaultValue={l?.duration_minutes ?? 60} required /></div>
      <div className="sm:col-span-2"><label className="label">Price (R)</label><NumberField name="price" min={0} step="0.01" buttonStep={10} prefix="R" defaultValue={l ? l.price_cents / 100 : ""} placeholder="0" required /></div>
      <div className="sm:col-span-2"><label className="label">Order</label><NumberField name="sort_order" defaultValue={l?.sort_order ?? 0} /></div>
      <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold sm:col-span-3">
        <input type="checkbox" name="active" defaultChecked={l?.active ?? true} className="switch" /> Bookable
      </label>
      <div className="sm:col-span-3 sm:text-right"><SubmitButton>{l ? "Save" : "Add lesson type"}</SubmitButton></div>
    </form>
  );
}
