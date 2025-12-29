import { redirect } from "next/navigation";
import { getAnalyticsData } from "./actions";
import { AnalyticsClient } from "./AnalyticsClient";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const startDate = typeof params.startDate === "string" ? params.startDate : undefined;
  const endDate = typeof params.endDate === "string" ? params.endDate : undefined;
  const eventType = typeof params.eventType === "string" ? params.eventType : undefined;

  const { events, stats, isAdmin, error } = await getAnalyticsData(
    startDate,
    endDate,
    eventType
  );

  if (error && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AnalyticsClient
      initialEvents={events}
      initialStats={stats}
      initialStartDate={startDate}
      initialEndDate={endDate}
      initialEventType={eventType}
    />
  );
}
