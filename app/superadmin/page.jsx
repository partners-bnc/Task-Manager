export const metadata = {
  title: 'Super Admin',
  description: 'Super admin workspace',
};

export default function SuperAdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Central Control</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Super Admin Panel</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Phase 1 is wiring centralized authentication to this route. The full super admin
          workspace will be built in a later phase.
        </p>
      </div>
    </main>
  );
}
