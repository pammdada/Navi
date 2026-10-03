import { createRoot } from 'react-dom/client';
import SidePanel from './SidePanel';
import './SidePanel.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<SidePanel />);
