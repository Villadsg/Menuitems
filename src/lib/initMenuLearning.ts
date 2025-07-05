/**
 * Menu Learning System Initialization
 * 
 * This script initializes the menu learning system when the application starts.
 * It loads the feedback data from the most recent backup and prepares the system
 * to apply learned corrections to new menu items.
 */

import { initializeMenuLearningSystem } from './menuLearningSystem';

/**
 * Initialize the menu learning system
 * This function should be called when the application starts
 */
export async function initializeMenuLearning(): Promise<void> {
  console.log('Initializing menu learning system...');
  
  // Skip initialization in browser environment
  if (typeof window !== 'undefined') {
    console.log('Skipping menu learning system initialization in browser environment');
    return;
  }
  
  try {
    // Initialize from the default location (server-side only)
    await initializeMenuLearningSystem();
    console.log('Menu learning system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize menu learning system:', error);
    console.log('Menu OCR will continue to work without learned corrections');
  }
}
