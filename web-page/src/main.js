// Import Shoelace theme styles and components
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

// Bootstrap - Import and register all components
import { EditorComponent } from './features/editor/editor-component.js';
import { PreviewComponent } from './features/preview/preview-component.js';
import { HeaderComponent } from './features/header/header-component.js';
import { AppComponent } from './features/app-component.js';
import { LightboxModal } from './components/lightbox-modal.js';
import { AppLoader } from './components/app-loader.js';

// Initialize theme from localStorage, default to light
const savedTheme = localStorage.getItem('chartreTheme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (savedTheme === 'dark') {
    document.documentElement.classList.add('sl-theme-dark');
}

console.log('Chartre components registered successfully');
