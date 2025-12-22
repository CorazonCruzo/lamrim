import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/read/:sectionId" element={<ReaderPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
