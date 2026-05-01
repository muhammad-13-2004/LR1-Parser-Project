import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ParserProvider } from './context/ParserContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ParserProvider>
      <App />
    </ParserProvider>
  </React.StrictMode>
);