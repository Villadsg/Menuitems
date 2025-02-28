# LangTours

A web application for uploading and managing restaurant menus with OCR capabilities.

## Features

- Upload restaurant menu photos
- Automatic text extraction from menu photos using OCR
- Location-based menu discovery
- User authentication with Appwrite

## OCR Functionality

The application uses the GOT-OCR2_0 model from Hugging Face to extract text from uploaded menu photos. When a user uploads a menu photo, the application automatically:

1. Extracts text content from the menu image
2. Structures the data into menu items with categories, names, descriptions, and prices
3. Stores both the raw OCR text and structured data in Appwrite

## Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file based on `.env.example`
4. Add your Hugging Face API token to the `.env` file
5. Start the development server with `npm run dev`

## Environment Variables

```
# Hugging Face API token for OCR
VITE_HUGGING_FACE_API_TOKEN=your_huggingface_token_here
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
