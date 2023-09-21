import { createRoot } from 'react-dom/client';
import Main from './app/Main';
import './index.scss';

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(<Main/>);