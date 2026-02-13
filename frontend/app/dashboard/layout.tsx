import TopNav from "@/app/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-deep nature-bg">
      <TopNav />
      <main className="pt-14">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
