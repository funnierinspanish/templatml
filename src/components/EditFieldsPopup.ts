
import Sortable from 'sortablejs';
import { db } from '../idb';
import { AlertPopup } from './AlertPopup';

export interface CustomField {
  label: string;
  bind_to_variable: string;
  value?: string;
  placeholder?: string;
}

export class EditFieldsPopup extends HTMLElement {
  private fields: CustomField[] = [];
  private fieldsContainer!: HTMLElement;
  private sortable!: Sortable;

  constructor() {
    super();
    this.dismissPopup = this.dismissPopup.bind(this);
    this.handleAddField = this.handleAddField.bind(this);
  }

  async connectedCallback() {
    this.fields = await db.getAll() as CustomField[];
    if (this.fields.length === 0) {
      this.fields = [
        {"label": "Name", "bind_to_variable": "USER_NAME", "value": "George Costanza"},
        {"label": "Message", "bind_to_variable": "APP_MESSAGE", "placeholder": "Say it outloud!"}
      ];
      await this.saveLayout();
    }
    this.render();
    this.fieldsContainer = this.querySelector('.fields-container')!;
    this.renderFields();
    this.setupDragAndDrop();
    this.attachListeners();
  }

  render() {
    this.innerHTML = `
      <style>
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .popup-content {
          background-color: var(--color-bg);
          padding: var(--gap);
          border-radius: var(--radius);
          box-shadow: 0 4px 12px hsl(0 0% 0% / 0.1);
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .popup-title {
          margin-bottom: var(--gap-large);
        }

        .fields-container {
          display: grid;
          gap: var(--gap-small);
          margin-bottom: var(--gap-large);
        }

        .field-card {
          background-color: var(--color-bg-alt);
          border-radius: var(--radius);
          border: 1px solid var(--color-border);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--gap-small);
          background-color: var(--color-bg-muted);
          cursor: grab;
        }

        .card-header span {
          font-weight: bold;
        }

        .delete-button {
          background: none;
          border: none;
          color: var(--color-text);
          font-size: 1.2rem;
          cursor: pointer;
          width: 4ch;
        }

        .card-body {
          padding: var(--gap-small);
          display: grid;
          gap: var(--gap-small);
        }

        .popup-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--gap-small);
        }
      </style>
      <div class="popup-overlay">
        <div class="popup-content">
          <h2 class="popup-title">Edit Form Fields</h2>
          <div class="fields-container"></div>
          <div class="popup-actions">
            <button id="close-button" class="muted">Close</button>
            <button id="add-field-button" class="secondary">Add New Field</button>
          </div>
        </div>
      </div>
    `;
  }

  renderFields() {
    this.fieldsContainer.innerHTML = '';
    this.fields.forEach((field, index) => {
      const fieldCard = this.createFieldCard(field, index);
      this.fieldsContainer.appendChild(fieldCard);      
    });
    // @ts-ignore
    <HTMLInputElement>this.querySelector("input[data-index='0']")?.focus();
  }

  createFieldCard(field: CustomField, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'field-card';
    card.dataset.index = index.toString();
    card.innerHTML = `
      <div class="card-header">
        <span>${field.label}</span>
        <button class="delete-button" data-index="${index}">&times;</button>
      </div>
      <div class="card-body">
        <label>Label</label>
        <input type="text" class="label-input" value="${field.label}" data-index="${index}">
        <label>Bind to Variable</label>
        <input type="text" class="bind-input" value="${field.bind_to_variable}" data-index="${index}">
        <label>Value (Optional)</label>
        <input type="text" class="value-input" value="${field.value || ''}" data-index="${index}">
        <label>Placeholder (Optional)</label>
        <input type="text" class="placeholder-input" value="${field.placeholder || ''}" data-index="${index}">
      </div>
    `;

    return card;
  }

  setupDragAndDrop() {
    this.sortable = new Sortable(this.fieldsContainer, {
      animation: 150,
      onEnd: (evt: any) => {
        const { oldIndex, newIndex } = evt;
        if (oldIndex !== undefined && newIndex !== undefined) {
          const [movedItem] = this.fields.splice(oldIndex, 1);
          this.fields.splice(newIndex, 0, movedItem);
          this.renderFields();
          this.saveLayout();
        }
      },
    });
  }

  attachListeners() {
    // Handle Escape key to close the popup
    this.addEventListener('keyup', (e) => {
      console.log('e', e)
      if (e.key === 'Escape') {
        this.dismissPopup();
      }
    });
    this.querySelector('#close-button')?.addEventListener('click', this.dismissPopup);
    this.querySelector('#add-field-button')?.addEventListener('click', this.handleAddField);
    this.fieldsContainer.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('delete-button')) {
        const index = parseInt((e.target as HTMLElement).dataset.index!, 10);
        this.fields.splice(index, 1);
        this.renderFields();
        this.saveLayout();
      }
    });
    this.fieldsContainer.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index!, 10);
        const field = this.fields[index];
        if (target.classList.contains('label-input')) {
            field.label = target.value;
        } else if (target.classList.contains('bind-input')) {
            field.bind_to_variable = target.value;
        } else if (target.classList.contains('value-input')) {
            field.value = target.value;
        } else if (target.classList.contains('placeholder-input')) {
            field.placeholder = target.value;
        }
        this.saveLayout();
    });
  }

  handleAddField() {
    const newField: CustomField = {
      label: 'New Field',
      bind_to_variable: 'NEW_VARIABLE',
      value: '',
      placeholder: ''
    };
    this.fields.push(newField);
    this.renderFields();
    this.saveLayout();
  }

  async dismissPopup() {
    this.closePopup();
  }

  async saveLayout() {
    await db.saveLayout(this.fields);
    this.dispatchEvent(new CustomEvent('fields-changed', { bubbles: true, composed: true }));
  }

  closePopup() {
    this.remove();
  }
}

customElements.define('edit-fields-popup', EditFieldsPopup);
