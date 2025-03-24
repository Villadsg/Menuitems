#!/usr/bin/env node

/**
 * This script downloads all photos from an Appwrite bucket to local storage
 * and then optionally empties the bucket.
 * 
 * Usage:
 *   node download-and-clear-photos.js [--empty-bucket]
 * 
 * Options:
 *   --empty-bucket  Empty the bucket after downloading all photos (default: false)
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client, Storage, Query, Databases } from 'node-appwrite';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Initialize dotenv
config();

// App Configuration
// Get directory name (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appConfig = {
  endpoint: process.env.PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY, // This should be a server API key with storage permissions
  bucketId: process.env.APPWRITE_BUCKET_ID || '66efdb420000df196b64', // Default from your code
  databaseId: process.env.APPWRITE_DATABASE_ID || '66efdb3c0000a6b0d9b9', // Database ID
  feedbackCollectionId: '67dfc9c800121e7b3df6', // Menu OCR feedback collection ID
  outputDir: '/home/villadsg/Documents/menuphotos', // External storage directory
  emptyBucket: process.argv.includes('--empty-bucket')
};

// Create Appwrite client
const client = new Client()
  .setEndpoint(appConfig.endpoint)
  .setProject(appConfig.projectId)
  .setKey(appConfig.apiKey);

const storage = new Storage(client);
const databases = new Databases(client);

// Ensure output directory exists
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

// Download a file from a URL
async function downloadFile(url, outputPath) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading file: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Validate configuration
    if (!appConfig.projectId || !appConfig.apiKey) {
      console.error('Error: Missing required environment variables.');
      console.error('Please ensure the following variables are set:');
      console.error('  - PUBLIC_APPWRITE_PROJECT_ID');
      console.error('  - APPWRITE_API_KEY');
      process.exit(1);
    }

    console.log('Starting photo download process...');
    console.log(`Bucket ID: ${appConfig.bucketId}`);
    console.log(`Output directory: ${appConfig.outputDir}`);
    
    // Create output directory
    ensureDirectoryExists(appConfig.outputDir);
    
    // Create a subdirectory with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const backupDir = path.join(appConfig.outputDir, `${dateStr}_${timeStr}`);
    ensureDirectoryExists(backupDir);
    
    // Create a metadata file to track the download
    const metadataFile = path.join(backupDir, 'metadata.json');
    const metadata = {
      timestamp: now.toISOString(),
      bucketId: appConfig.bucketId,
      databaseId: appConfig.databaseId,
      feedbackCollectionId: appConfig.feedbackCollectionId,
      files: [],
      feedbackEntries: []
    };
    
    // List all files in the bucket
    console.log('Fetching file list from Appwrite...');
    let offset = 0;
    const limit = 100;
    let totalFiles = 0;
    let downloadedFiles = 0;
    let failedFiles = 0;
    
    // Process files in batches
    while (true) {
      const filesList = await storage.listFiles(
        appConfig.bucketId,
        [
          Query.limit(limit),
          Query.offset(offset)
        ]
      );
      
      if (!filesList.files || filesList.files.length === 0) {
        break;
      }
      
      totalFiles += filesList.files.length;
      console.log(`Processing batch of ${filesList.files.length} files (offset: ${offset})...`);
      
      // Download each file
      for (const file of filesList.files) {
        try {
          console.log(`Downloading file: ${file.name} (ID: ${file.$id})`);
          
          // Generate file URL
          // We need to create a full URL with the endpoint
          const fileUrl = `${appConfig.endpoint}/storage/buckets/${appConfig.bucketId}/files/${file.$id}/download?project=${appConfig.projectId}&key=${appConfig.apiKey}`;
          
          // Create a filename with the original file ID to ensure uniqueness
          const fileExtension = path.extname(file.name) || '.jpg';
          const fileName = `${file.$id}${fileExtension}`;
          const outputPath = path.join(backupDir, fileName);
          
          // Download the file
          await downloadFile(fileUrl, outputPath);
          
          // Add to metadata
          metadata.files.push({
            id: file.$id,
            name: file.name,
            size: file.sizeOriginal,
            mimeType: file.mimeType,
            localPath: fileName,
            createdAt: file.$createdAt
          });
          
          downloadedFiles++;
          console.log(`Successfully downloaded: ${file.name} (${downloadedFiles}/${totalFiles})`);
        } catch (error) {
          console.error(`Failed to download file ${file.name} (ID: ${file.$id}): ${error.message}`);
          failedFiles++;
        }
      }
      
      // Move to next batch
      offset += filesList.files.length;
      
      // If we got fewer files than the limit, we've reached the end
      if (filesList.files.length < limit) {
        break;
      }
    }
    
    // Write metadata file
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    console.log(`Metadata saved to: ${metadataFile}`);
    
    // Download menu OCR feedback data
    console.log('\nFetching menu OCR feedback data...');
    let feedbackOffset = 0;
    let totalFeedback = 0;
    let downloadedFeedback = 0;
    
    // Create a directory for feedback data
    const feedbackDir = path.join(backupDir, 'feedback');
    ensureDirectoryExists(feedbackDir);
    
    // Process feedback entries in batches
    while (true) {
      try {
        const feedbackList = await databases.listDocuments(
          appConfig.databaseId,
          appConfig.feedbackCollectionId,
          [
            Query.limit(limit),
            Query.offset(feedbackOffset)
          ]
        );
        
        if (!feedbackList.documents || feedbackList.documents.length === 0) {
          break;
        }
        
        totalFeedback += feedbackList.documents.length;
        console.log(`Processing batch of ${feedbackList.documents.length} feedback entries (offset: ${feedbackOffset})...`);
        
        // Save each feedback entry
        for (const feedback of feedbackList.documents) {
          try {
            // Create a JSON file for each feedback entry
            const feedbackFileName = `feedback_${feedback.$id}.json`;
            const feedbackPath = path.join(feedbackDir, feedbackFileName);
            
            // Save the feedback data
            fs.writeFileSync(feedbackPath, JSON.stringify(feedback, null, 2));
            
            // Add to metadata
            metadata.feedbackEntries.push({
              id: feedback.$id,
              imageId: feedback.image_id || '',
              restaurantName: feedback.restaurant_name || '',
              localPath: `feedback/${feedbackFileName}`,
              createdAt: feedback.$createdAt
            });
            
            downloadedFeedback++;
            console.log(`Saved feedback entry: ${feedback.$id} (${downloadedFeedback}/${totalFeedback})`);
          } catch (error) {
            console.error(`Failed to save feedback entry ${feedback.$id}: ${error.message}`);
          }
        }
        
        // Move to next batch
        feedbackOffset += feedbackList.documents.length;
        
        // If we got fewer entries than the limit, we've reached the end
        if (feedbackList.documents.length < limit) {
          break;
        }
      } catch (error) {
        console.error(`Error fetching feedback data: ${error.message}`);
        break;
      }
    }
    
    // Summary
    console.log('\nDownload Summary:');
    console.log(`Total files: ${totalFiles}`);
    console.log(`Successfully downloaded: ${downloadedFiles}`);
    console.log(`Failed downloads: ${failedFiles}`);
    console.log(`Total feedback entries: ${totalFeedback}`);
    console.log(`Successfully downloaded feedback: ${downloadedFeedback}`);
    console.log(`Files saved to: ${backupDir}`);
    
    // Empty the bucket and feedback collection if requested
    if (appConfig.emptyBucket && (totalFiles > 0 || totalFeedback > 0)) {
      console.log('\nEmptying bucket...');
      
      // Reset offset for deletion
      offset = 0;
      let deletedFiles = 0;
      let failedDeletions = 0;
      
      while (true) {
        const filesList = await storage.listFiles(
          appConfig.bucketId,
          [
            Query.limit(limit),
            Query.offset(offset)
          ]
        );
        
        if (!filesList.files || filesList.files.length === 0) {
          break;
        }
        
        console.log(`Deleting batch of ${filesList.files.length} files...`);
        
        for (const file of filesList.files) {
          try {
            await storage.deleteFile(appConfig.bucketId, file.$id);
            deletedFiles++;
            console.log(`Deleted file: ${file.name} (ID: ${file.$id})`);
          } catch (error) {
            console.error(`Failed to delete file ${file.name} (ID: ${file.$id}): ${error.message}`);
            failedDeletions++;
          }
        }
        
        // If we got fewer files than the limit, we've reached the end
        if (filesList.files.length < limit) {
          break;
        }
      }
      
      console.log('\nFile Deletion Summary:');
      console.log(`Successfully deleted: ${deletedFiles}`);
      console.log(`Failed deletions: ${failedDeletions}`);
      
      // Delete feedback entries if requested
      if (totalFeedback > 0) {
        console.log('\nEmptying feedback collection...');
        
        // Reset offset for deletion
        let feedbackOffset = 0;
        let deletedFeedback = 0;
        let failedFeedbackDeletions = 0;
        
        while (true) {
          try {
            const feedbackList = await databases.listDocuments(
              appConfig.databaseId,
              appConfig.feedbackCollectionId,
              [
                Query.limit(limit),
                Query.offset(feedbackOffset)
              ]
            );
            
            if (!feedbackList.documents || feedbackList.documents.length === 0) {
              break;
            }
            
            console.log(`Deleting batch of ${feedbackList.documents.length} feedback entries...`);
            
            for (const feedback of feedbackList.documents) {
              try {
                await databases.deleteDocument(
                  appConfig.databaseId,
                  appConfig.feedbackCollectionId,
                  feedback.$id
                );
                deletedFeedback++;
                console.log(`Deleted feedback entry: ${feedback.$id}`);
              } catch (error) {
                console.error(`Failed to delete feedback entry ${feedback.$id}: ${error.message}`);
                failedFeedbackDeletions++;
              }
            }
            
            // If we got fewer entries than the limit, we've reached the end
            if (feedbackList.documents.length < limit) {
              break;
            }
          } catch (error) {
            console.error(`Error fetching feedback data for deletion: ${error.message}`);
            break;
          }
        }
        
        console.log('\nFeedback Deletion Summary:');
        console.log(`Successfully deleted: ${deletedFeedback}`);
        console.log(`Failed deletions: ${failedFeedbackDeletions}`);
      }
    }
    
    console.log('\nProcess completed successfully!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();
