export default function Flash({ error, success }: { error?: string; success?: string | false }) {
  if (error) return <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>;
  if (success) return <p className="mb-5 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">{success}</p>;
  return null;
}
