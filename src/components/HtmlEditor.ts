import { db } from '../idb.js';


export class HtmlEditor extends HTMLElement {
  public editor!: HTMLTextAreaElement;
  private defaultTemplate: string = `<!DOCTYPE html>
  <html lang="en">
  
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  
  <body style="
        margin: 0;
        padding: 0;
        background: {BACKGROUND_COLOR};
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
        color: #3c4043!important;
      ">
    <main style="background-color: #3c4043; padding: 1rem 1.75rem;">
      <h1 style="color: #14986cff">Hello {NAME}</h1>
      <p>
        I have a message for you:
      </p>
      <p style="text-align: center;">
        {MESSAGE}
      </p>
      <p style="text-align: center;">
        {OWNER}
      </p>
    </main>
  </body>
  
  </html>
`;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        :host { 
          display: block; 
          height: 100%; 
          /* Use CSS vars from parent stylesheet */
          background-color: var(--color-bg); 
        }
        textarea {
          height: 100%;
          width: 100%;
          padding: 1rem;
          font-family: monospace;
          font-size: 0.9rem;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-y: auto;
          box-sizing: border-box; /* Ensure padding is included */
          margin: 0;
          border: none;
          resize: none; /* Disable manual resize */
          /* Inherit colors from :root */
          background-color: var(--color-bg);
          color: var(--color-text);
        }
        textarea:focus {
          outline: 2px solid var(--color-primary, #3b82f6);
          outline-offset: -2px;
        }
      </style>
      <textarea name="html-template"></textarea>
    `;
    this.editor = this.shadowRoot!.querySelector('textarea')!;

  }
  
  async connectedCallback() {
    try {
      const storedTemplate = await this.loadTemplateFromIDB();
      this.editor.value = storedTemplate;
    } catch (error) {
      this.editor.value = this.defaultTemplate;
    }
    
    this.editor.addEventListener('input', () => {
      this.dispatchTemplateChangeEvent();
    });

    this.dispatchTemplateChangeEvent();
  }

  async loadTemplateFromIDB() {
    return await db.get('template');
  }

  async updateStoredTemplate(template: string) {
    await db.put('template', template);
  }


  async dispatchTemplateChangeEvent() {
    let vars = this.listVariablesInTemplate(this.editor.value)
    await this.updateStoredTemplate(this.editor.value);
    this.dispatchEvent(new CustomEvent('templatechange', {
      detail: {template: this.editor.value, variables: vars}, 
      bubbles: true,
      composed: true
    }));
  }

  listVariablesInTemplate(sourceString: string): string[]{
    const variables: string[] = [];
    const regex = /{\s*([\w_]+)(?:\[(\d+)\])?\s*}/g;
    let match;
    while ((match = regex.exec(sourceString)) !== null) {
      const varName = match[1];
      const indexStr = match[2];
      const index = indexStr ? parseInt(indexStr, 10) :
      variables.push(varName);
    }
    return variables;
  }
}

customElements.define('html-editor', HtmlEditor);
