import AppLayout from '@/components/AppLayout';
import './dashboard.css';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="wellness-theme dashboard-theme">
            <AppLayout>{children}</AppLayout>
        </div>
    );
}
