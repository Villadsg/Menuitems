# DeepSeek-OCR Service

A FastAPI service that wraps the DeepSeek-OCR model for menu image processing.

## Requirements

- Python 3.12.9
- NVIDIA GPU with CUDA 11.8 or later
- At least 8GB GPU memory (for the 3B parameter model)

## Installation

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

Note: Installing `flash-attn` may take some time as it needs to be compiled.

## Configuration

Set the following environment variables (optional):

- `CUDA_DEVICE`: GPU device ID (default: "0")
- `PORT`: Service port (default: 8000)

## Running the Service

Start the service:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The service will be available at `http://localhost:8000`

## API Endpoints

### Health Check
```bash
GET /
GET /health
```

### OCR Generation (Ollama-compatible API)
```bash
POST /api/generate
Content-Type: application/json

{
  "image": "base64_encoded_image_string",
  "prompt": "optional custom prompt",
  "base_size": 1024,
  "image_size": 640,
  "crop_mode": true,
  "test_compress": true
}
```

### File Upload OCR
```bash
POST /api/ocr/upload
Content-Type: multipart/form-data

file: <image file>
```

## Response Format

The service returns structured menu data:

```json
{
  "menuItems": [
    {
      "name": "Item Name",
      "description": "Item description",
      "price": "$10.00",
      "category": "Category Name"
    }
  ],
  "restaurantName": "Restaurant Name",
  "rawText": "Full markdown text from OCR",
  "enhancedStructure": null,
  "debug": {
    "model": "deepseek-ai/DeepSeek-OCR",
    "prompt_used": "...",
    "items_found": 5
  }
}
```

## Testing

Test the service:
```bash
curl http://localhost:8000/health
```

## Integration with LangTours

Update your `.env` file:
```env
DEEPSEEK_OCR_BASE_URL=http://localhost:8000
DEEPSEEK_OCR_TIMEOUT=60000
```

The service is designed to be compatible with the existing Ollama API format used in LangTours.

## Troubleshooting

### CUDA Out of Memory
- Reduce `base_size` and `image_size` parameters
- Close other GPU-intensive applications
- Use a smaller batch size if processing multiple images

### Model Loading Issues
- Ensure you have enough disk space (model is ~6GB)
- Check that CUDA is properly installed: `python -c "import torch; print(torch.cuda.is_available())"`
- Verify transformers version: `pip show transformers`

### Slow Inference
- First inference is slower due to model initialization
- Subsequent requests should be faster
- Consider using a GPU with more VRAM for better performance

## Performance Notes

- First request takes longer (~30-60s) due to model loading
- Subsequent requests: ~3-10s depending on image size
- Memory usage: ~6-8GB GPU VRAM
- CPU fallback is not recommended (extremely slow)
