// Initialize theme from localStorage, default to light
const savedTheme = localStorage.getItem('chartreTheme') || localStorage.getItem('chartreTheme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Bootstrap - Import and register all components
import { EditorComponent } from './components/editor-component.js';
import { PreviewComponent } from './components/preview-component.js';
import { HeaderComponent } from './components/header-component.js';
import { AppComponent } from './components/app-component.js';
import { LightboxComponent } from './components/lightbox-component.js';

// Register custom elements
customElements.define('editor-component', EditorComponent);
customElements.define('preview-component', PreviewComponent);
customElements.define('header-component', HeaderComponent);
customElements.define('plant-app', AppComponent);
customElements.define('lightbox-modal', LightboxComponent);

console.log('PlantUML Editor initialized with Lit components');

