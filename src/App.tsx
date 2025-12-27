import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout';
import { EmailLinkHandler } from './components/auth';
import { SettingsProvider, AuthProvider, ProgressProvider, NotesProvider } from './contexts';
import {
  HomePage,
  ReaderPage,
  NotesPage,
  SettingsPage,
  NotFoundPage,
} from './pages';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ProgressProvider>
          <NotesProvider>
            <BrowserRouter>
              <EmailLinkHandler />
              <MainLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/read/:sectionId" element={<ReaderPage />} />
                  <Route path="/notes" element={<NotesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </MainLayout>
            </BrowserRouter>
          </NotesProvider>
        </ProgressProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
