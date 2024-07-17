import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import './OCRComponent.css'; // Import a CSS file for styling

GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

const OCRComponent = () => {
  const [ocrText, setOcrText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0); // New state for tracking progress

  const handleFileChange = async (event) => {
    setIsLoading(true);
    setProgress(0); // Reset progress on new file upload
    const file = event.target.files[0];
    setOcrText('');

    if (!file) {
      setIsLoading(false);
      return;
    }

    if (file.type === 'application/pdf') {
      const pdf = await getDocument(URL.createObjectURL(file)).promise;
      let allText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const text = await Tesseract.recognize(
          canvas,
          'eng',
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                setProgress((pageNum - 1) / pdf.numPages + m.progress / pdf.numPages);
              }
            }
          }
        ).then(({ data: { text } }) => text);

        allText += text + '\n\n';
      }

      setOcrText(allText);
    } else {
      Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(m.progress);
            }
          }
        }
      ).then(({ data: { text } }) => {
        setOcrText(text);
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="ocr-container">
      <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="file-input"/>
      {isLoading && <div className="progress-bar" style={{ width: `${progress * 100}%` }}></div>}
      <textarea value={ocrText} readOnly className="ocr-result"></textarea>
      {isLoading && <p>Processing, please wait...</p>}
    </div>
  );
};

export default OCRComponent;