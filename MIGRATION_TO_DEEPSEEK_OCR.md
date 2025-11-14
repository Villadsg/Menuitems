# Migration Guide: Qwen 2.5 VL to DeepSeek-OCR

This guide explains the changes made to migrate from Qwen 2.5 VL (via Ollama) to DeepSeek-OCR (via custom FastAPI service).

## Overview of Changes

The OCR system has been upgraded from using Qwen 2.5 VL through Ollama to using DeepSeek-OCR through a custom FastAPI service. This provides:

- Better structured output (markdown with automatic parsing)
- Improved context compression (10x ratio)
- More consistent menu extraction
- Better handling of complex document layouts

## What Changed

### 1. Backend Service

**Before (Qwen 2.5 VL + Ollama):**
- Service: Ollama
- Port: 11434
- Model: `qwen2.5vl:7b`
- Installation: Simple (`ollama pull qwen2.5vl:7b`)

**After (DeepSeek-OCR + FastAPI):**
- Service: Custom Python FastAPI service
- Port: 8000
- Model: `deepseek-ai/DeepSeek-OCR`
- Installation: Python environment with CUDA requirements

### 2. Environment Variables

**Before:**
```env
QWEN_VL_BASE_URL=http://localhost:11434
QWEN_VL_MODEL=qwen2.5vl:7b
QWEN_VL_TIMEOUT=30000
```

**After:**
```env
DEEPSEEK_OCR_BASE_URL=http://localhost:8000
DEEPSEEK_OCR_TIMEOUT=60000
```

### 3. Code Changes

#### File: `src/lib/ocrService.ts`

**Configuration (lines 20-43):**
```typescript
// Before
private static defaultConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5vl:7b',
  timeout: 30000
};

// After
private static defaultConfig = {
  baseUrl: 'http://localhost:8000',
  timeout: 60000
};
```

**API Request (lines 125-165):**
```typescript
// Before: Ollama API format
const response = await fetch(`${config.baseUrl}/api/generate`, {
  method: 'POST',
  body: JSON.stringify({
    model: config.model,
    prompt: `You are an expert at reading...`,
    images: [imageBase64],
    stream: false
  }),
});

// After: DeepSeek-OCR API format
const response = await fetch(`${config.baseUrl}/api/generate`, {
  method: 'POST',
  body: JSON.stringify({
    image: imageBase64,
    prompt: `<image>\n<|grounding|>Extract this menu...`,
    base_size: 1024,
    image_size: 640,
    crop_mode: true,
    test_compress: true
  }),
});
```

**Response Parsing (lines 150-175):**
```typescript
// Before: Manual JSON parsing from text response
let rawResponse = data.response || data.message?.content;
const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  enhancedMenuStructure = JSON.parse(jsonMatch[0]);
  menuItems = this.convertEnhancedStructureToMenuItems(enhancedMenuStructure);
}

// After: Direct structured response
if (data.menuItems && Array.isArray(data.menuItems)) {
  menuItems = data.menuItems.map((item: any) => ({
    name: item.name || '',
    description: item.description || '',
    price: item.price || '',
    category: item.category || 'Uncategorized'
  }));
  rawText = data.rawText || '';
}
```

#### File: `src/routes/create-quiz/+page.svelte`

**Direct Processing for Anonymous Users (lines 62-139):**
```typescript
// Before: Call Ollama directly
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    model: 'qwen2.5vl:7b',
    prompt: `You are an expert...`,
    images: [base64String],
    stream: false
  }),
});

// After: Call DeepSeek-OCR service
const response = await fetch('http://localhost:8000/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    image: base64String,
    prompt: `<image>\n<|grounding|>Extract this menu...`,
    base_size: 1024,
    image_size: 640,
    crop_mode: true,
    test_compress: true
  }),
});
```

### 4. New Files Created

#### `deepseek-ocr-service/` Directory
- `main.py` - FastAPI service implementation
- `requirements.txt` - Python dependencies
- `README.md` - Service documentation
- `.env.example` - Environment variable template
- `Dockerfile` - Docker container configuration
- `docker-compose.yml` - Docker Compose setup

#### Documentation
- `setup-deepseek-ocr.md` - Setup and installation guide
- `MIGRATION_TO_DEEPSEEK_OCR.md` - This migration guide

### 5. Error Messages

Error messages have been updated to reflect the new service:

```typescript
// Before
'Cannot connect to Qwen VL service. Please ensure Qwen 2.5 VL is running locally on port 11434.'

// After
'Cannot connect to DeepSeek-OCR service. Please ensure the DeepSeek-OCR service is running locally on port 8000.'
```

## Migration Steps

### Step 1: Stop Old Service (Optional)

If you want to keep Ollama running for other purposes, you can skip this step.

```bash
# Stop Ollama service
# Linux: sudo systemctl stop ollama
# macOS: brew services stop ollama
# Or just close the Ollama application
```

### Step 2: Set Up DeepSeek-OCR Service

1. **Navigate to service directory**
   ```bash
   cd deepseek-ocr-service
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
   Note: This may take 10-20 minutes

4. **Verify CUDA**
   ```bash
   python -c "import torch; print(torch.cuda.is_available())"
   ```
   Should output: `True`

5. **Start service**
   ```bash
   python main.py
   ```
   Service will start on http://localhost:8000

### Step 3: Update Application Configuration

1. **Update `.env` file**
   ```bash
   # Remove old variables
   # QWEN_VL_BASE_URL=...
   # QWEN_VL_MODEL=...
   # QWEN_VL_TIMEOUT=...

   # Add new variables
   DEEPSEEK_OCR_BASE_URL=http://localhost:8000
   DEEPSEEK_OCR_TIMEOUT=60000
   ```

2. **Verify changes**
   The code changes have already been applied to:
   - `src/lib/ocrService.ts`
   - `src/routes/create-quiz/+page.svelte`
   - `.env.example`

### Step 4: Test the Migration

1. **Check service health**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Test with application**
   - Start your SvelteKit dev server: `npm run dev`
   - Upload a menu image
   - Verify OCR results are returned correctly

3. **Check console logs**
   Look for:
   - "Calling DeepSeek-OCR for menu analysis..."
   - "Menu items extracted from DeepSeek-OCR: X"
   - "Model: deepseek-ai/DeepSeek-OCR"

### Step 5: Monitor Performance

1. **GPU Usage**
   ```bash
   watch -n 1 nvidia-smi
   ```

2. **Service Logs**
   Check terminal where DeepSeek-OCR service is running

3. **First Request**
   - Expect 30-60s for first OCR request (model loading)
   - Subsequent requests: 3-10s

## Rollback Plan

If you need to rollback to Qwen 2.5 VL:

1. **Stop DeepSeek-OCR service**
   ```bash
   # Press Ctrl+C in the terminal running the service
   ```

2. **Restore old environment variables**
   ```env
   QWEN_VL_BASE_URL=http://localhost:11434
   QWEN_VL_MODEL=qwen2.5vl:7b
   QWEN_VL_TIMEOUT=30000
   ```

3. **Revert code changes**
   ```bash
   git checkout HEAD -- src/lib/ocrService.ts
   git checkout HEAD -- src/routes/create-quiz/+page.svelte
   git checkout HEAD -- .env.example
   ```

4. **Start Ollama**
   ```bash
   ollama serve
   ```

## Troubleshooting

### Service Won't Start

1. **Check CUDA availability**
   ```bash
   nvidia-smi
   python -c "import torch; print(torch.cuda.is_available())"
   ```

2. **Check port availability**
   ```bash
   lsof -i :8000  # Linux/macOS
   netstat -ano | findstr :8000  # Windows
   ```

3. **Check dependencies**
   ```bash
   pip list | grep -E "torch|transformers|fastapi"
   ```

### OCR Not Working

1. **Check service is running**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check environment variables**
   ```bash
   echo $DEEPSEEK_OCR_BASE_URL
   ```

3. **Check browser console**
   - Look for connection errors
   - Verify API endpoint URLs

### Performance Issues

1. **Slow first request**: Normal (30-60s for model loading)
2. **Consistently slow**: Check GPU is being used with `nvidia-smi`
3. **Out of memory**: Reduce `base_size` and `image_size` parameters

## Benefits of Migration

1. **Better Output Quality**
   - Structured markdown output
   - Better table detection
   - Improved price extraction

2. **Context Compression**
   - 10x compression ratio
   - Faster processing of large menus
   - Reduced memory usage for downstream tasks

3. **Improved Accuracy**
   - 97%+ accuracy on structured documents
   - Better handling of complex layouts
   - More consistent results

4. **Better Integration**
   - Custom API tailored to menu extraction
   - Structured response format
   - Easier to extend and customize

## Next Steps

1. Monitor the service in production
2. Collect user feedback on OCR quality
3. Fine-tune parameters if needed (`base_size`, `image_size`)
4. Consider setting up as system service for auto-restart
5. Set up monitoring and alerting

## Support

If you encounter issues:

1. Check the logs for error messages
2. Review `setup-deepseek-ocr.md` for troubleshooting
3. Verify all prerequisites are met (GPU, CUDA, dependencies)
4. Test with the health check endpoint first

## Additional Resources

- DeepSeek-OCR Setup Guide: `setup-deepseek-ocr.md`
- Service README: `deepseek-ocr-service/README.md`
- Original Qwen Guide: `setup-qwen-vl.md` (for reference)
