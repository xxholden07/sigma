import { FusionReactorDashboard } from '@/components/dashboard/fusion-reactor-dashboard';

export default function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <main>
      <FusionReactorDashboard />
    </main>
  );
}
