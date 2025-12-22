import type { ReactNode } from 'react';
import Header from './Header';
import './MainLayout.css';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="main-layout">
      <Header />
      <main className="main-layout__content">{children}</main>
    </div>
  );
}
