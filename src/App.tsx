import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout';
import { SettingsProvider, AuthProvider } from './contexts';
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
        <BrowserRouter>
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
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
