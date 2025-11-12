
// We import the .js file, as that's what the browser will see post-compilation.
import { CustomField, db } from '../idb.js';
import './EditFieldsPopup.js';

// Export the class definition so other files can import its *type*
export class TemplateForm extends HTMLElement {
  // Define types for class properties
  private form!: HTMLFormElement;
  private customFieldsContainer!: HTMLDivElement;
  private clearFormButton!: HTMLButtonElement;
  private editButton!: HTMLButtonElement;
  private copyButton!: HTMLButtonElement;
  private downloadButton!: HTMLButtonElement;
  private defaultFields: CustomField[];


  constructor() {
    super();
    // Bind methods
    this.handleInput = this.handleInput.bind(this);
    this.handleClearFormClick = this.handleClearFormClick.bind(this);
    this.handleEditClick = this.handleEditClick.bind(this);
    this.handleCopyClick = this.handleCopyClick.bind(this);
    this.handleDownloadClick = this.handleDownloadClick.bind(this);
    this.defaultFields = [
        {"label": "Name", "bind_to_variable": "NAME", "value": "George Costanza"},
        {"label": "Message", "bind_to_variable": "MESSAGE", "value": "All your base are belong to..."},
        {"label": "Base Owner", "bind_to_variable": "OWNER", "placeholder": "You, me, them, us..."}
    ];
  }

  connectedCallback() {
    this.render();
    this.attachListeners();
    // Chain async load and initial dispatch
    this.loadInputFieldsFromIDB().then(() => {
      this.dispatchChange();
    });
  }

  static observedAttributes = ["variables"];

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "variables") {
      if (oldValue !== newValue || !oldValue) {
        const currentTemplateVariables = JSON.parse(newValue);
        this.highlightVariablesInputs(currentTemplateVariables);
      }
    }
  }

  render() {
    this.innerHTML = `
      <style>
        form {
          display: grid;
          gap: var(--gap-small);
          
          & > .form-fieldset {
            display: grid;
            gap: var(--gap-small);

            & input {
              border-radius: 0 var(--radius) var(--radius) 0;
              
              &.var-exists {
                border-left: 4px solid var(--color-secondary);
              }
                
              &.var-missing {
                border-left: 4px solid var(--color-warning);
              }
            }
          }
          
        }
        .form-actions {
          display: grid;
          gap: var(--gap-small);
          border-top: 1px solid var(--color-border);
          padding-top: var(--gap-large);
        }
        .highlight {
          border-left: 4px solid var(--color-secondary)!important;
        }}
      </style>
      <form id="variables-form">
        <div class="form-fieldset" id="custom-fields">
          <!-- Custom fields will be injected here -->
        </div>
        
        <button type="button" id="edit-fields-button" class="secondary">Edit Form Fields</button>
        <button type="reset" id="clear-form-button" class="muted">Clear Form</button>
      </form>
      
      <div class="form-actions">
        <button type="button" id="copy-button">Copy HTML</button>
        <button type="button" id="download-button">Download HTML</button>
      </div>
    `;

    // Cache elements (using ! for non-null assertion)
    this.form = this.querySelector('form')!;
    this.customFieldsContainer = this.querySelector('#custom-fields')!;
    this.clearFormButton = this.querySelector('#clear-form-button')!;
    this.editButton = this.querySelector('#edit-fields-button')!;
    this.copyButton = this.querySelector('#copy-button')!;
    this.downloadButton = this.querySelector('#download-button')!;
  }

  private highlightVariablesInputs(variables: string[]) {
    this.querySelectorAll<HTMLInputElement>('input[data-variable]').forEach(input => {
      if (variables.includes(input.dataset.variable!)) {
        input.classList.remove('var-missing');
        input.classList.add('var-exists');
      } else {
        input.classList.remove('var-exists');
        input.classList.add('var-missing');
      }
    });
  }

  private attachListeners() {
    this.addEventListener('input', this.handleInput);
    this.clearFormButton.addEventListener('click', this.handleClearFormClick);
    this.editButton.addEventListener('click', this.handleEditClick);
    this.copyButton.addEventListener('click', this.handleCopyClick);
    this.downloadButton.addEventListener('click', this.handleDownloadClick);
    document.addEventListener('fields-changed', () => this.loadInputFieldsFromIDB());
  }

  private handleInput(e: Event) {
    if ((e.target as HTMLElement).matches('input[data-variable]')) {
      this.dispatchChange();
    }
  }

  private dispatchChange() {
    this.dispatchEvent(new CustomEvent('variableschange', {
      detail: this.getVariables(),
      bubbles: true,
      composed: true
    }));
  }

  async loadInputFieldsFromIDB() {
    let fields: CustomField[];
    try {
        fields = await db.getAll();
        if (fields.length === 0) {
            fields = this.defaultFields;
        }
    } catch (error) {
      fields = this.defaultFields;
    }
    await this.createInputFields(fields);   
  }

  async createInputFields(fields: CustomField[]) {
    this.customFieldsContainer.innerHTML = '';
    await db.saveLayout(fields);
    for (const field of fields) {
      this.createFieldInput(field.label, field.bind_to_variable, field.value, field.placeholder);
    }
    this.dispatchChange();
  }

  async createFieldInput(label: string, variableName: string, value: string = '', placeholder: string = '') {
    const fieldId = `field-${variableName}`;
    const fieldHtml = `
      <div>
        <label for="${fieldId}">${label}</label>
        <input type="text" id="${fieldId}" data-variable="${variableName}" value="${value}" placeholder="${placeholder}">
      </div>
    `;
    
    this.customFieldsContainer.insertAdjacentHTML('beforeend', fieldHtml);
    
    // Save current value on 'blur' event
    this.form.querySelector<HTMLInputElement>(`#${fieldId}`)?.addEventListener('blur', (e) => {
      this.updateFieldValue(e.target as HTMLInputElement);
    }, true);
  }

  async updateFieldValue(inputElement: HTMLInputElement) {
    const inputElementValues = {
      label: inputElement.previousElementSibling?.textContent || '',
      bind_to_variable: inputElement.dataset.variable || '',
      value: inputElement.value,
      placeholder: inputElement.placeholder
    }
    db.updateField(inputElementValues).then(
      (result) => {
        if (result === true) {
          this.dispatchChange();
        }
      },
      (error) => {
        console.error('Error updating field:', error);
      }
    )
  }

  private handleClearFormClick() {
    const inputs = this.querySelectorAll<HTMLInputElement>('input[data-variable]');
    let fieldsArr: CustomField[] = [];
    for (const input of inputs) {
      fieldsArr.push({
        label: input.previousElementSibling?.textContent || '',
        bind_to_variable: input.dataset.variable || '',
        value: '',
        placeholder: input.placeholder
      })
    }
    this.createInputFields(fieldsArr);
    this.dispatchChange();
  }

  private handleEditClick() {
    const popup = document.createElement('edit-fields-popup');
    this.appendChild(popup);
  }

  private handleCopyClick() {
    this.dispatchEvent(new CustomEvent('copyrequest', { bubbles: true, composed: true }));
  }

  private handleDownloadClick() {
    this.dispatchEvent(new CustomEvent('downloadrequest', { bubbles: true, composed: true }));
  }

  private getVariables(): Record<string, string> {
    const inputs = this.querySelectorAll<HTMLInputElement>('input[data-variable]');
    const variables: Record<string, string> = {};
    inputs.forEach(input => {
      const key = input.dataset.variable!;
      const value = input.value.trim();
      variables[key] = value;
    });
    return variables;
  }
}

customElements.define('template-form', TemplateForm);