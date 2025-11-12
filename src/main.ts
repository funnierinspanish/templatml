import './components/TemplateForm.js';
import './components/HtmlEditor.js';
import './components/LivePreview.js';
import './components/AlertPopup.js';
// Import component *types* for TypeScript.
import type { LivePreview } from './components/LivePreview.js';
import type { TemplateForm } from './components/TemplateForm.js';
import type { AlertPopup } from './components/AlertPopup.js';
import type { HtmlEditor } from './components/HtmlEditor.js';

// App State
let preview: LivePreview | null = null;
let templateForm: TemplateForm | null = null;
let popup: AlertPopup | null = null;
let currentVariables: Record<string, string> = {};
let currentTemplate: string = '';
let renderedHTML: string = '';


function replaceVariables(template: string, variables: Record<string, string>): string {
  
  // This regex captures the variable name (group 1)
  // and an optional index (group 2).
  const regex = /{\s*([\w_]+)(?:\[(\d+)\])?\s*}/g;

  return template.replace(regex, (match, varName: string, indexStr?: string): string => {
    
    const fullValue = variables[varName]?.trim();
    
    if (fullValue === undefined) {
      return match; 
    }

    // If no value sub index is requested
    if (indexStr === undefined) {
      return fullValue;
    }

    // An index was requested. Example string value: 'Davey Grohley'
    // {NAME[0]} => To get the first part of a full name: 'Davey'
    // {NAME[1]} => To get the first part of a full name: 'Grohley'
    // {NAME[2]} => An out of range index makes the index be ignored completely: 'Davey Grohley'

    const index = parseInt(indexStr, 10); // Parse "0" into 0
    
    // If not split by spaces, then the requested index is ignored.
    if (!fullValue.includes(' ')) {
      return fullValue;
    }

    const parts = fullValue.split(' ');
    
    // Check if index is out of range. If so, return the full value.
    if (index < 0 || index >= parts.length) {
      return fullValue;
    }

    return parts[index]; 
  });
}

// Re-render the template preview
function renderPreview(): void {
  if (preview) {
    renderedHTML = replaceVariables(currentTemplate, currentVariables);
    preview.update(renderedHTML);
  }
}

// Copy the HTML template using the modern clipboard API
async function handleCopy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(renderedHTML);
    popup?.show('HTML copied to clipboard!', 'success');
  } catch (err) {
    console.error('Failed to copy: ', err);
    popup?.show('Failed to copy HTML.', 'error');
  }
}

// Download the HTML template using the traditional method
function legacyFileDownload(html: string): void {
  const filename = `template.html`;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

async function saveHTMLToFileSystem(html: string) {
  try {
    const options = {
      types: [{
        description: 'HTML Files',
        accept: { 'text/html': ['.html'] },
      }],
    };
    const handle = await (window as any).showSaveFilePicker(options);
    const writable = await handle.createWritable();
    await writable.write(html);
    await writable.close();
  } catch (err: DOMException | any) {
    // User cancelled the save dialog; do nothing.
    if (err.code === 20) {
      return;
    }
    if (popup) {
      popup.show('Failed to save file.', err.message || 'error');
    }
  }
}


// --- Event Listeners
document.addEventListener('variableschange', (e: Event) => {
  currentVariables = (e as CustomEvent<Record<string, string>>).detail;
  renderPreview();
});

document.addEventListener('templatechange', (e: Event) => {
  const eventDetail = (e as CustomEvent<Record<string, string>>).detail;
  currentTemplate = eventDetail.template;
  templateForm?.setAttribute('variables', JSON.stringify(eventDetail.variables));
  renderPreview();
});

document.addEventListener('copyrequest', handleCopy);
document.addEventListener('downloadrequest', () => {
  if ('showSaveFilePicker' in window) {
    saveHTMLToFileSystem(renderedHTML);
  } else {
    legacyFileDownload(renderedHTML);
  }
  popup?.show('Downloading HTML.', 'success');
});

Promise.all([
  customElements.whenDefined('live-preview'),
  customElements.whenDefined('alert-popup'),
  customElements.whenDefined('template-form'),
  customElements.whenDefined('html-editor')
]).then(() => {
  preview = document.querySelector('live-preview');
  templateForm = document.querySelector('template-form');
  popup = document.querySelector('alert-popup');
  currentTemplate = (document.querySelector('html-editor') as HtmlEditor).editor.value;
  renderPreview();
});
