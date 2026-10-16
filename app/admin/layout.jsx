import Workspace from '@/components/workspace';
import { ThemeScript } from '@/components/workspace/theme';

export const metadata = {
  title: { default: 'Administration — Pluko', template: '%s — Pluko' },
  robots: { index: false, follow: false },
};

export default function AdminLayout() {
  return <><ThemeScript /><Workspace audience="admin" /></>;
}
