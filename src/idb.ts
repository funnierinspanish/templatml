// db.ts

// Define the shape of our custom field data
export interface CustomField {
  label: string;
  bind_to_variable: string;
  value?: string;
  placeholder?: string;
}

export class IDBHelper {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private storeName: string;
  private version: number;

  constructor(dbName: string, storeName: string, version = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  async init(): Promise<IDBHelper> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this);
      };

      request.onerror = (event) => {
        console.error('IDB Error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    if (!this.db) {
      throw new Error('Database is not initialized.');
    }
    try {
      const transaction = this.db.transaction(this.storeName, mode);
      return transaction.objectStore(this.storeName);
    } catch (error) {
      console.error('Error getting store:', error);
      throw error;
    }
  }

  async getAll(): Promise<CustomField[]> {
    return new Promise(async (resolve, reject) => {
      let store: IDBObjectStore | undefined;
      try {
        store = await this.getStore('readonly');
      } catch (error) {
        return reject(error);
      }
      const request = store.get('layout');
      request.onsuccess = () => resolve(request.result?.fields || []);
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async saveLayout(fields: CustomField[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const store = await this.getStore('readwrite');
        const request = store.get('layout');
        request.onsuccess = () => {
            const data = request.result || { fields: [], history: [] };
            data.history.push(data.fields);
            if (data.history.length > 10) { // Keep history limited
                data.history.shift();
            }
            data.fields = fields;
            const putRequest = store.put(data, 'layout');
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = (e) => reject((e.target as IDBRequest).error);
        };
        request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async updateField(field: CustomField): Promise<boolean|Error> {
    return new Promise(async (resolve, reject) => {
        const store = await this.getStore('readwrite');
        const request = store.get('layout');
        request.onsuccess = () => {
          const data = request.result;
          if (data) {
            console.log('    DATA   :', data)
              const index = data.fields.findIndex((f: CustomField) => f.bind_to_variable === field.bind_to_variable);
              if (index !== -1) {
                  data.fields[index] = field;
                  store.put(data, 'layout');
                  resolve(true);
              } else {
                  resolve(false);
              }
          } else {
            reject(new Error('Layout not found'));
          }
        }
        request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async get(storeName: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
        const store = await this.getStore('readonly');
        const request = store.get(storeName);
        request.onsuccess = () => {
          const data = request.result;
          if (data) {
            resolve(data);
          } else {
            reject(new Error('Layout not found'));
          }
        }
      });
  }

  async put(storeName: string, data: any): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const store = await this.getStore('readwrite');
      const request = store.put(data, storeName);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    })
  }


  // TODO
  async undo(): Promise<CustomField[] | null> {
    return new Promise(async (resolve, reject) => {
        const store = await this.getStore('readwrite');
        const request = store.get('layout');
        request.onsuccess = () => {
            const data = request.result;
            if (data && data.history.length > 0) {
                data.fields = data.history.pop();
                const putRequest = store.put(data, 'layout');
                putRequest.onsuccess = () => resolve(data.fields);
                putRequest.onerror = (e) => reject((e.target as IDBRequest).error);
            } else {
                resolve(null);
            }
        };
        request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }
}

// Export a singleton instance.
export const db = await new IDBHelper('templateAppDB', 'layouts').init();