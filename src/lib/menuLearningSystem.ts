/**
 * Menu Learning System
 * 
 * This module implements a learning system that analyzes user corrections to menu items
 * and applies learned patterns to improve future OCR processing.
 */

import type { MenuOCRResult } from './ocrService';
import fs from 'fs';
import path from 'path';

interface MenuFeedback {
  id: string;
  image_id: string;
  original_items: any[];
  corrected_items: any[];
  restaurant_name?: string;
  created_at: string;
}

interface CorrectionPattern {
  type: 'price' | 'description' | 'name' | 'shared_description';
  original: string;
  corrected: string;
  frequency: number;
  confidence: number;
}

export class MenuLearningSystem {
  private static instance: MenuLearningSystem;
  private correctionPatterns: CorrectionPattern[] = [];
  private sharedDescriptionPatterns: Map<string, string[]> = new Map();
  private isInitialized = false;
  
  /**
   * Get the singleton instance of the MenuLearningSystem
   */
  public static getInstance(): MenuLearningSystem {
    if (!MenuLearningSystem.instance) {
      MenuLearningSystem.instance = new MenuLearningSystem();
    }
    return MenuLearningSystem.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Initialize the learning system with feedback data
   * @param feedbackDir Directory containing the downloaded feedback data
   */
  public async initialize(feedbackDir: string): Promise<void> {
    if (this.isInitialized) {
      console.log('Menu learning system already initialized');
      return;
    }
    
    try {
      console.log(`Initializing menu learning system from ${feedbackDir}`);
      
      // Check if directory exists
      if (!fs.existsSync(feedbackDir)) {
        console.error(`Feedback directory does not exist: ${feedbackDir}`);
        return;
      }
      
      // Read all feedback files
      const files = fs.readdirSync(feedbackDir)
        .filter(file => file.startsWith('feedback_') && file.endsWith('.json'));
      
      console.log(`Found ${files.length} feedback files`);
      
      if (files.length === 0) {
        console.log('No feedback data available for learning');
        return;
      }
      
      // Process each feedback file
      for (const file of files) {
        try {
          const filePath = path.join(feedbackDir, file);
          const feedbackData = JSON.parse(fs.readFileSync(filePath, 'utf8')) as MenuFeedback;
          
          // Extract correction patterns
          this.extractCorrectionPatterns(feedbackData);
        } catch (error) {
          console.error(`Error processing feedback file ${file}:`, error);
        }
      }
      
      // Consolidate and rank correction patterns
      this.consolidateCorrectionPatterns();
      
      console.log(`Initialized menu learning system with ${this.correctionPatterns.length} correction patterns`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing menu learning system:', error);
    }
  }
  
  /**
   * Extract correction patterns from a feedback entry
   * @param feedback The feedback data
   */
  private extractCorrectionPatterns(feedback: MenuFeedback): void {
    if (!feedback.original_items || !feedback.corrected_items) {
      return;
    }
    
    // Create a map of original items by ID for easy lookup
    const originalItemsMap = new Map();
    feedback.original_items.forEach(item => {
      if (item.id) {
        originalItemsMap.set(item.id, item);
      }
    });
    
    // Find items with the same descriptions in corrected items (potential shared descriptions)
    const descriptionGroups = new Map<string, string[]>();
    feedback.corrected_items.forEach(item => {
      if (item.description && item.description.trim() !== '') {
        if (!descriptionGroups.has(item.description)) {
          descriptionGroups.set(item.description, []);
        }
        descriptionGroups.get(item.description)?.push(item.id || '');
      }
    });
    
    // Extract shared descriptions (descriptions used by multiple items)
    descriptionGroups.forEach((itemIds, description) => {
      if (itemIds.length > 1) {
        // This is a potential shared description
        this.sharedDescriptionPatterns.set(description, itemIds);
      }
    });
    
    // Compare each corrected item with its original
    feedback.corrected_items.forEach(correctedItem => {
      if (!correctedItem.id) return;
      
      const originalItem = originalItemsMap.get(correctedItem.id);
      if (!originalItem) return;
      
      // Check for price corrections
      if (originalItem.price !== correctedItem.price) {
        this.addCorrectionPattern({
          type: 'price',
          original: originalItem.price || '',
          corrected: correctedItem.price || '',
          frequency: 1,
          confidence: 0.8
        });
      }
      
      // Check for name corrections
      if (originalItem.name !== correctedItem.name) {
        this.addCorrectionPattern({
          type: 'name',
          original: originalItem.name || '',
          corrected: correctedItem.name || '',
          frequency: 1,
          confidence: 0.7
        });
      }
      
      // Check for description corrections
      if (originalItem.description !== correctedItem.description) {
        this.addCorrectionPattern({
          type: 'description',
          original: originalItem.description || '',
          corrected: correctedItem.description || '',
          frequency: 1,
          confidence: 0.6
        });
      }
    });
  }
  
  /**
   * Add a correction pattern to the list
   * @param pattern The correction pattern to add
   */
  private addCorrectionPattern(pattern: CorrectionPattern): void {
    // Check if a similar pattern already exists
    const existingIndex = this.correctionPatterns.findIndex(p => 
      p.type === pattern.type && 
      p.original === pattern.original && 
      p.corrected === pattern.corrected
    );
    
    if (existingIndex >= 0) {
      // Update existing pattern
      this.correctionPatterns[existingIndex].frequency += 1;
      this.correctionPatterns[existingIndex].confidence = Math.min(
        0.95, 
        this.correctionPatterns[existingIndex].confidence + 0.05
      );
    } else {
      // Add new pattern
      this.correctionPatterns.push(pattern);
    }
  }
  
  /**
   * Consolidate and rank correction patterns
   */
  private consolidateCorrectionPatterns(): void {
    // Sort by frequency and confidence
    this.correctionPatterns.sort((a, b) => {
      if (a.frequency !== b.frequency) {
        return b.frequency - a.frequency;
      }
      return b.confidence - a.confidence;
    });
    
    // Remove duplicates and low-confidence patterns
    this.correctionPatterns = this.correctionPatterns.filter((pattern, index, self) => {
      // Keep only patterns with confidence > 0.5
      if (pattern.confidence <= 0.5) return false;
      
      // Check for duplicates
      return index === self.findIndex(p => 
        p.type === pattern.type && 
        p.original === pattern.original && 
        p.corrected === pattern.corrected
      );
    });
  }
  
  /**
   * Apply learned corrections to a menu OCR result
   * @param ocrResult The OCR result to correct
   * @returns Corrected OCR result
   */
  public applyLearnedCorrections(ocrResult: MenuOCRResult): MenuOCRResult {
    if (!this.isInitialized || !ocrResult.menuItems) {
      return ocrResult;
    }
    
    console.log('Applying learned corrections to OCR result');
    
    // Apply correction patterns to each menu item
    ocrResult.menuItems = ocrResult.menuItems.map(item => {
      // Apply price corrections
      if (item.price) {
        const pricePattern = this.correctionPatterns.find(p => 
          p.type === 'price' && p.original === item.price
        );
        
        if (pricePattern) {
          console.log(`Applying learned price correction: ${item.price} -> ${pricePattern.corrected}`);
          item.price = pricePattern.corrected;
        }
      }
      
      // Apply name corrections
      if (item.name) {
        const namePattern = this.correctionPatterns.find(p => 
          p.type === 'name' && p.original === item.name
        );
        
        if (namePattern) {
          console.log(`Applying learned name correction: ${item.name} -> ${namePattern.corrected}`);
          item.name = namePattern.corrected;
        }
      }
      
      // Apply description corrections
      if (item.description) {
        const descPattern = this.correctionPatterns.find(p => 
          p.type === 'description' && p.original === item.description
        );
        
        if (descPattern) {
          console.log(`Applying learned description correction: ${item.description} -> ${descPattern.corrected}`);
          item.description = descPattern.corrected;
        }
      }
      
      return item;
    });
    
    // Apply shared description patterns
    this.applySharedDescriptionPatterns(ocrResult);
    
    return ocrResult;
  }
  
  /**
   * Apply shared description patterns to menu items
   * @param ocrResult The OCR result to process
   */
  private applySharedDescriptionPatterns(ocrResult: MenuOCRResult): void {
    // Group items by category
    const itemsByCategory: Record<string, MenuOCRResult['menuItems']> = {};
    ocrResult.menuItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
    });
    
    // Process each category
    Object.keys(itemsByCategory).forEach(category => {
      const categoryItems = itemsByCategory[category];
      
      // Look for items with descriptions that match our learned shared descriptions
      categoryItems.forEach(item => {
        if (!item.description) return;
        
        // Check if this description is a known shared description
        if (this.sharedDescriptionPatterns.has(item.description)) {
          console.log(`Found learned shared description: ${item.description}`);
          
          // Apply this description to other items in the same category
          categoryItems.forEach(otherItem => {
            if (otherItem !== item && (!otherItem.description || otherItem.description.trim() === '')) {
              console.log(`Applying shared description to item: ${otherItem.name}`);
              otherItem.description = item.description;
            }
          });
        }
      });
    });
  }
  
  /**
   * Get statistics about the learning system
   * @returns Statistics object
   */
  public getStatistics(): any {
    return {
      initialized: this.isInitialized,
      totalPatterns: this.correctionPatterns.length,
      patternsByType: {
        price: this.correctionPatterns.filter(p => p.type === 'price').length,
        name: this.correctionPatterns.filter(p => p.type === 'name').length,
        description: this.correctionPatterns.filter(p => p.type === 'description').length
      },
      sharedDescriptionPatterns: this.sharedDescriptionPatterns.size
    };
  }
}

/**
 * Initialize the menu learning system from the most recent feedback data
 * @param baseDir Base directory for feedback data
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeMenuLearningSystem(baseDir: string = '/home/villadsg/Documents/menuphotos'): Promise<void> {
  try {
    // Find the most recent backup directory
    const dirs = fs.readdirSync(baseDir)
      .filter(dir => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/.test(dir))
      .sort()
      .reverse();
    
    if (dirs.length === 0) {
      console.log('No backup directories found');
      return;
    }
    
    const latestDir = path.join(baseDir, dirs[0]);
    const feedbackDir = path.join(latestDir, 'feedback');
    
    if (!fs.existsSync(feedbackDir)) {
      console.log(`Feedback directory does not exist: ${feedbackDir}`);
      return;
    }
    
    // Initialize the learning system
    const learningSystem = MenuLearningSystem.getInstance();
    await learningSystem.initialize(feedbackDir);
    
    console.log(`Menu learning system initialized from ${feedbackDir}`);
  } catch (error) {
    console.error('Error initializing menu learning system:', error);
  }
}

/**
 * Apply learned corrections to a menu OCR result
 * @param ocrResult The OCR result to correct
 * @returns Corrected OCR result
 */
export function applyLearnedMenuCorrections(ocrResult: MenuOCRResult): MenuOCRResult {
  const learningSystem = MenuLearningSystem.getInstance();
  return learningSystem.applyLearnedCorrections(ocrResult);
}
