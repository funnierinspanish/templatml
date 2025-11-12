export class AlertPopup extends HTMLElement {
  private messageElement!: HTMLParagraphElement;
  private dismissTimer: number | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Make the host element the popover
    this.setAttribute('popover', '');
    this.setAttribute('role', 'alert');
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        /* Styles for the host element */
        :host {
          padding: 1rem 1.5rem;
          border: none;
          border-radius: var(--radius, 6px);
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          margin: 0;
          /* CSS 'popover' behavior adds entry/exit animations */
          transition: opacity 0.3s, transform 0.3s, overlay 0.3s;
        }

        :host(.success) {
          background-color: #28a745; /* Green */
          color: white;
        }

        :host(.error) {
          background-color: #dc3545; /* Red */
          color: white;
        }

        /* The ::backdrop is styled in style.css */
      </style>
      <p id="message"></p>
    `;

    this.messageElement = this.shadowRoot!.querySelector('#message')!;
  }

  /**
   * Shows the alert with a message.
   * @param message The text to display.
   * @param type The type of alert ('success' or 'error').
   * @param duration The time in ms before auto-dismissing.
   */
  show(message: string, type: 'success' | 'error' = 'success', duration: number = 3000) {
    // Clear any existing timer
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }

    this.messageElement.textContent = message;
    this.className = type;

    this.showPopover();

    // Set auto-dismiss timer
    this.dismissTimer = window.setTimeout(() => {
      try {
        this.hidePopover();
      } catch (e) { return }
    }, duration);
  }
}

customElements.define('alert-popup', AlertPopup);