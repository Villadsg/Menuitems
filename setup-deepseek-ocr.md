# DeepSeek-OCR Setup Guide

This guide will help you set up DeepSeek-OCR locally for OCR functionality in your menu reading application.

## Prerequisites

- **GPU**: NVIDIA GPU with CUDA support (8GB+ VRAM recommended)
- **CUDA**: Version 11.8 or later
- **RAM**: 16GB+ recommended
- **Storage**: 20GB+ free space (for model and dependencies)
- **Python**: 3.12.9 (or 3.11+)
- **OS**: Linux (Ubuntu 22.04 recommended), macOS, or Windows with WSL2

## Installation

### Step 1: Set Up Python Environment

1. **Create a virtual environment**
   ```bash
   cd deepseek-ocr-service
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Upgrade pip**
   ```bash
   pip install --upgrade pip
   ```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

**Note**: Installing `flash-attn` may take 10-20 minutes as it needs to be compiled for your specific GPU architecture.

### Step 3: Verify CUDA Installation

```bash
python -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'CUDA Version: {torch.version.cuda}'); print(f'GPU Count: {torch.cuda.device_count()}')"
```

Expected output:
```
CUDA Available: True
CUDA Version: 11.8
GPU Count: 1
```

### Step 4: Start the Service

1. **Using Python directly**
   ```bash
   cd deepseek-ocr-service
   python main.py
   ```

2. **Using uvicorn**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Using Docker (GPU required)**
   ```bash
   docker-compose up --build
   ```

The service will start on `http://localhost:8000`

### Step 5: Verify Installation

1. **Health check**
   ```bash
   curl http://localhost:8000/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "model_loaded": true,
     "cuda_available": true,
     "cuda_device_count": 1
   }
   ```

2. **Test OCR with sample image**
   ```bash
   curl -X POST http://localhost:8000/api/ocr/upload \
     -F "file=@/path/to/menu_image.jpg"
   ```

## Configuration

### Environment Variables

Create a `.env` file in the `deepseek-ocr-service` directory:

```env
# GPU device ID (default: 0)
CUDA_DEVICE=0

# Service port (default: 8000)
PORT=8000

# Optional: Hugging Face token for private models
# HF_TOKEN=your_token_here
```

### LangTours Application Configuration

Update your main application's `.env` file:

```env
# DeepSeek-OCR Configuration
DEEPSEEK_OCR_BASE_URL=http://localhost:8000
DEEPSEEK_OCR_TIMEOUT=60000
```

## API Endpoints

### Health Check
```bash
GET http://localhost:8000/health
```

### OCR Generation (Ollama-compatible)
```bash
POST http://localhost:8000/api/generate
Content-Type: application/json

{
  "image": "base64_encoded_image",
  "prompt": "optional custom prompt",
  "base_size": 1024,
  "image_size": 640,
  "crop_mode": true,
  "test_compress": true
}
```

### File Upload OCR
```bash
POST http://localhost:8000/api/ocr/upload
Content-Type: multipart/form-data

file: <image file>
```

### Response Format
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

## Troubleshooting

### Model Loading Issues

1. **Model not downloading**
   - Check internet connection
   - Verify Hugging Face access
   - Ensure sufficient disk space (~6GB for model)

2. **CUDA Out of Memory**
   ```
   RuntimeError: CUDA out of memory
   ```
   **Solutions**:
   - Close other GPU-intensive applications
   - Reduce `base_size` and `image_size` parameters
   - Use a GPU with more VRAM (8GB minimum)

3. **Flash Attention Build Errors**
   ```
   ERROR: Failed building wheel for flash-attn
   ```
   **Solutions**:
   - Ensure CUDA development toolkit is installed
   - Update gcc/g++ to compatible versions
   - Install with: `pip install flash-attn --no-build-isolation`

### Performance Issues

1. **Slow First Request**
   - First request takes 30-60s due to model loading
   - Subsequent requests should be 3-10s
   - This is normal behavior

2. **Consistently Slow Inference**
   - Verify GPU is being used: `nvidia-smi`
   - Check GPU utilization during inference
   - Ensure CUDA is properly installed
   - Consider using a more powerful GPU

3. **Connection Errors**
   ```
   Cannot connect to DeepSeek-OCR service
   ```
   **Solutions**:
   - Verify service is running: `curl http://localhost:8000/health`
   - Check firewall settings
   - Ensure port 8000 is not blocked

### Memory Management

1. **Service crashes with OOM**
   - Monitor system RAM: Service uses ~6-8GB
   - Monitor GPU VRAM: Model uses ~6-8GB VRAM
   - Reduce concurrent requests
   - Restart service periodically if processing many images

## Performance Benchmarks

| GPU Model | VRAM | First Request | Subsequent Requests | Notes |
|-----------|------|---------------|---------------------|-------|
| RTX 3060 | 12GB | 45s | 5-8s | Recommended minimum |
| RTX 3080 | 10GB | 35s | 3-5s | Good performance |
| RTX 4090 | 24GB | 25s | 2-4s | Excellent performance |
| A100 | 40GB | 20s | 1-3s | Best performance |

## Production Deployment

### Using systemd (Linux)

1. **Create service file**
   ```bash
   sudo nano /etc/systemd/system/deepseek-ocr.service
   ```

2. **Add configuration**
   ```ini
   [Unit]
   Description=DeepSeek-OCR Service
   After=network.target

   [Service]
   Type=simple
   User=youruser
   WorkingDirectory=/path/to/deepseek-ocr-service
   Environment="PATH=/path/to/venv/bin"
   ExecStart=/path/to/venv/bin/python main.py
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start**
   ```bash
   sudo systemctl enable deepseek-ocr
   sudo systemctl start deepseek-ocr
   sudo systemctl status deepseek-ocr
   ```

### Using Docker Compose

```bash
cd deepseek-ocr-service
docker-compose up -d
```

Monitor logs:
```bash
docker-compose logs -f
```

## Comparison with Qwen 2.5 VL

| Feature | DeepSeek-OCR | Qwen 2.5 VL |
|---------|--------------|-------------|
| Model Size | 3B parameters | 7B parameters |
| GPU Required | Yes (CUDA) | Optional |
| VRAM Usage | 6-8GB | 4-6GB |
| Accuracy | High (97%+) | Very High |
| Speed | Fast (2-10s) | Medium (5-15s) |
| Output Format | Markdown + Structured | JSON |
| Context Compression | Yes (10x) | No |
| Special Features | Document-to-markdown | Multi-language OCR |

## Migration from Qwen 2.5 VL

The DeepSeek-OCR service is designed to be compatible with the existing Ollama API format. Key changes:

1. **Base URL**: Changed from `http://localhost:11434` to `http://localhost:8000`
2. **Response Format**: Already structured (no need for post-processing)
3. **Timeout**: Increased from 30s to 60s for first request
4. **Model**: Uses `deepseek-ai/DeepSeek-OCR` instead of `qwen2.5vl:7b`

## Next Steps

1. Start the DeepSeek-OCR service
2. Update your application's `.env` file
3. Test with a sample menu image
4. Monitor performance and GPU usage
5. Consider setting up as a system service for production

## Support & Resources

- **DeepSeek-OCR Model**: https://huggingface.co/deepseek-ai/DeepSeek-OCR
- **GitHub Repository**: https://github.com/deepseek-ai/DeepSeek-OCR
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **PyTorch CUDA Setup**: https://pytorch.org/get-started/locally/

## Monitoring

Monitor GPU usage during operation:
```bash
watch -n 1 nvidia-smi
```

Monitor service logs:
```bash
# If running with Python
tail -f /path/to/logs

# If running with Docker
docker-compose logs -f deepseek-ocr
```

Check service health:
```bash
curl http://localhost:8000/health | jq
```
