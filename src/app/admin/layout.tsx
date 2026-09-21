import WellnessSurface from '@/components/WellnessSurface';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <WellnessSurface className="wellness-admin">{children}</WellnessSurface>;
}
