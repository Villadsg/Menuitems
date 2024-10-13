// src/lib/formHelpers.ts

// Adds a new item to the array (e.g., adding steps, answers)
export function addItem<T>(array: T[], newItem: T): T[] {
    return [...array, newItem];
  }
  
  // Removes an item from the array by index (e.g., removing steps, answers)
  export function removeItem<T>(array: T[], index: number): T[] {
    return array.filter((_, i) => i !== index);
  }
  
  // Validates that all required fields in the form are filled
  export function validateRequiredFields(fields: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(fields)) {
      if (!value || value.trim() === '') {
        console.error(`Validation failed: Field "${key}" is required.`);
        return false;
      }
    }
    return true;
  }
  