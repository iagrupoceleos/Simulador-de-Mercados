/**
 * Prometheus – Entry Point
 * Initializes styles and boots the application.
 */
import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/charts.css';
import './styles/animations.css';
import { App } from './ui/app.js';

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

    // Expose for debugging
    window.__prometheus = app;

    console.log(
        '%c🔥 PROMETHEUS ENGINE v1.0.0 %c Motor de Simulación Adversaria ',
        'background: linear-gradient(135deg, #00e5ff, #b388ff); color: #0a0a0f; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
        'color: #9498a8; font-style: italic;'
    );
});
