import { createRoot } from 'react-dom/client';
import Main from './app/Main';
import './index.scss';
import { StrictMode } from 'react';

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(<Main/>);