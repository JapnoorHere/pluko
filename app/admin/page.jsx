import Workspace from '@/components/workspace';

export const metadata = {
  title: 'Administration — Pluko',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <Workspace audience="admin"/>;
}
