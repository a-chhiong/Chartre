// Import Shoelace theme styles and components
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

// Bootstrap - Import and register all components
import { EditorComponent } from './components/editor-component.js';
import { PreviewComponent } from './components/preview-component.js';
import { HeaderComponent } from './components/header-component.js';
import { AppComponent } from './components/app-component.js';
import { LightboxComponent } from './components/lightbox-component.js';
import { AppLoader } from './components/app-loader.js';

// Initialize theme from localStorage, default to light
const savedTheme = localStorage.getItem('chartreTheme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (savedTheme === 'dark') {
    document.documentElement.classList.add('sl-theme-dark');
}

// Register custom elements
customElements.define('editor-component', EditorComponent);
customElements.define('preview-component', PreviewComponent);
customElements.define('header-component', HeaderComponent);
customElements.define('chartre-app', AppComponent);
customElements.define('lightbox-modal', LightboxComponent);
customElements.define('app-loader', AppLoader);

console.log('Chartre components registered successfully');
