export class LivePreview extends HTMLElement {
  private renderContainer!: HTMLDivElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host { 
          display: block; 
          height: 100%; 
          width: 100%;
          background-color: light-dark(hsla(240, 5%, 96%, 0.75), hsl(240, 5%, 16%));
          overflow: auto;
        }
        #render-container {
          padding: 1rem;
          border: 2px solid var(--color-border-lighter);
          border-style: dashed;
        }
      </style>
      <div id="render-container"></div>
    `;
    this.renderContainer = this.shadowRoot!.querySelector('#render-container')!;
  }

  /**
   * Updates the component's rendered HTML.
   * @param {string} htmlString - The HTML to render.
   */
  update(htmlString: string): void {
    if (this.renderContainer) {
      // Set the innerHTML of the Shadow DOM container
      this.renderContainer.innerHTML = htmlString;
    }
  }
}

customElements.define('live-preview', LivePreview);