import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DocumentUploadPage from './components/DocumentUploadPage';
import DocumentListPage from './components/DocumentListPage';
import DocumentDownloadPage from './components/DocumentDownloadPage';
import { OCRProvider } from './context/OCRContext';

function App() {
  return (
    <OCRProvider>
      <Router>
        <Routes>
          <Route path="/upload" element={<DocumentUploadPage />} />
          <Route path="/documents" element={<DocumentListPage />} />
          <Route path="/" element={<DocumentUploadPage />} />
          <Route path="/download" element={<DocumentUploadPage />} />
        </Routes>
      </Router>
    </OCRProvider>
  );
}

export default App;