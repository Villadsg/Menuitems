# Qwen 2.5 VL Setup Guide

This guide will help you set up Qwen 2.5 VL locally for OCR functionality in your menu reading application.

## Prerequisites

- **RAM**: 8GB+ recommended (16GB+ for best performance)
- **Storage**: 50GB+ free space
- **OS**: Linux, macOS, or Windows with Docker
- **Network**: Stable internet connection for initial model download

## Installation Options

### Option 1: Using Ollama (Recommended)

1. **Install Ollama**
   ```bash
   # Linux/macOS
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Or download from https://ollama.com/download
   ```

2. **Download Qwen 2.5 VL Model**
   ```bash
   ollama pull qwen2.5vl:7b
   ```
   
   Note: This will download ~47GB. The download may take 30-60 minutes depending on your internet speed.

3. **Start the Ollama Service**
   ```bash
   ollama serve
   ```
   
   This will start the service on `http://localhost:11434`

4. **Test the Installation**
   ```bash
   curl -X POST http://localhost:11434/api/generate \
     -H "Content-Type: application/json" \
     -d '{
       "model": "qwen2.5vl:7b",
       "prompt": "What is in this image?",
       "images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="],
       "stream": false
     }'
   ```

### Option 2: Using Docker

1. **Pull the Docker image**
   ```bash
   docker pull ollama/ollama
   ```

2. **Run Ollama in Docker**
   ```bash
   docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
   ```

3. **Download the model**
   ```bash
   docker exec -it ollama ollama pull qwen2.5vl:7b
   ```

### Option 3: Direct Installation with Python

1. **Install dependencies**
   ```bash
   pip install torch torchvision transformers pillow
   ```

2. **Create a Python server script** (see `qwen-vl-server.py` below)

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Qwen VL Configuration
QWEN_VL_BASE_URL=http://localhost:11434
QWEN_VL_MODEL=qwen2.5vl:7b
QWEN_VL_TIMEOUT=30000
```

### Custom Configuration

You can customize the setup by modifying these values:

- **Base URL**: Change if running on different host/port
- **Model**: Use different model sizes (3b, 7b, 72b)
- **Timeout**: Adjust based on your hardware performance

## Testing the Setup

1. **Basic Test**
   ```bash
   curl -X POST http://localhost:11434/api/generate \
     -H "Content-Type: application/json" \
     -d '{
       "model": "qwen2.5vl:7b",
       "prompt": "Describe this image",
       "images": ["https://example.com/menu-image.jpg"],
       "stream": false
     }'
   ```

2. **Menu OCR Test**
   - Upload a menu image to your application
   - Check the browser console for "Calling Qwen 2.5 VL for OCR analysis..."
   - Verify the extracted menu items

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Ollama is running: `ollama serve`
   - Check if port 11434 is available
   - Verify firewall settings

2. **Model Not Found**
   - Ensure model is downloaded: `ollama list`
   - Re-download if necessary: `ollama pull qwen2.5vl:7b`

3. **Out of Memory**
   - Use smaller model: `qwen2.5vl:3b`
   - Reduce concurrent requests
   - Monitor system resources

4. **Slow Performance**
   - Ensure adequate RAM/VRAM
   - Use quantized models for faster inference
   - Consider using GPU acceleration

### Performance Tips

- **RAM**: Allocate 8-16GB for optimal performance
- **GPU**: Use CUDA-compatible GPU for faster processing
- **SSD**: Store model on SSD for faster loading
- **Batch Processing**: Process multiple images in batches if needed

## Model Variants

| Model | Size | RAM Required | Use Case |
|-------|------|-------------|----------|
| qwen2.5vl:3b | ~2GB | 4GB+ | Basic OCR, fast inference |
| qwen2.5vl:7b | ~4GB | 8GB+ | Balanced performance |
| qwen2.5vl:72b | ~45GB | 64GB+ | Highest accuracy |

## Next Steps

1. Start the Ollama service
2. Test with a sample menu image
3. Monitor performance and adjust settings as needed
4. Consider setting up as a system service for production use

## Support

- **Ollama Documentation**: https://ollama.com/docs
- **Qwen VL GitHub**: https://github.com/QwenLM/Qwen2.5-VL
- **Model Hub**: https://huggingface.co/Qwen/Qwen2.5-VL-7B