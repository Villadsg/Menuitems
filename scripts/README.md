# Photo Backup Utility

This utility script downloads all photos from your Appwrite bucket to local storage and optionally empties the bucket afterward.

## Prerequisites

- Node.js installed
- Appwrite API key with storage permissions
- Required environment variables set (see below)

## Environment Variables

The script requires the following environment variables:

```
PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_BUCKET_ID=your-bucket-id
```

You can add these to your `.env` file in the project root.

## Usage

1. Install dependencies:
```
npm install node-appwrite axios dotenv
```

2. Run the script:
```
node scripts/download-and-clear-photos.js
```

3. To download AND empty the bucket:
```
node scripts/download-and-clear-photos.js --empty-bucket
```

## What it does

1. Downloads all photos from the specified Appwrite bucket
2. Saves them to a timestamped directory in `uploads/menus/`
3. Creates a metadata.json file with information about each downloaded file
4. Optionally empties the bucket when done

## Output

Files are saved to: `uploads/menus/YYYY-MM-DD_HH-MM-SS/`

Each directory contains:
- All downloaded files, named with their original Appwrite IDs
- A metadata.json file with details about each file

## Safety

- By default, the script will NOT empty the bucket after downloading
- Use the `--empty-bucket` flag to explicitly enable bucket emptying
- Always verify your files were downloaded successfully before emptying the bucket
