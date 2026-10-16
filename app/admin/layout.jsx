import Workspace from '@/components/workspace';

export const metadata = {
  title: { default: 'Administration — Pluko', template: '%s — Pluko' },
  robots: { index: false, follow: false },
};

export default function AdminLayout() {
  return <Workspace audience="admin" />;
}
