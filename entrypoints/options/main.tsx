import { createRoot } from 'react-dom/client';
import Options from './Options';
import './Options.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<Options />);
