from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModel, AutoTokenizer
import torch
import os
import base64
import json
import re
from pathlib import Path
from typing import Optional, List, Dict, Any
import tempfile
import logging
import hashlib
from functools import lru_cache
from PIL import Image
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DeepSeek-OCR Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and tokenizer
model = None
tokenizer = None

# Cache for OCR results (stores last 50 results)
ocr_cache = {}

class OCRRequest(BaseModel):
    image: str  # Base64 encoded image
    prompt: Optional[str] = None
    base_size: Optional[int] = 1024
    image_size: Optional[int] = 640
    crop_mode: Optional[bool] = True
    test_compress: Optional[bool] = True

class MenuItem(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None

class OCRResponse(BaseModel):
    menuItems: List[MenuItem]
    restaurantName: Optional[str] = None
    rawText: str
    enhancedStructure: Optional[Dict[str, Any]] = None
    debug: Optional[Dict[str, Any]] = None

def load_model():
    """Load the DeepSeek-OCR model on startup"""
    global model, tokenizer

    if model is not None:
        return

    logger.info("Loading DeepSeek-OCR model...")

    # Set CUDA device
    os.environ["CUDA_VISIBLE_DEVICES"] = os.getenv("CUDA_DEVICE", "0")

    model_name = 'deepseek-ai/DeepSeek-OCR'

    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        model = AutoModel.from_pretrained(
            model_name,
            _attn_implementation='flash_attention_2',
            trust_remote_code=True,
            use_safetensors=True
        )
        model = model.eval().cuda().to(torch.bfloat16)
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise

def create_dummy_image():
    """Create a small dummy image for model warm-up"""
    # Create a simple 640x480 white image with some text
    img = Image.new('RGB', (640, 480), color='white')

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
        img.save(tmp_file, format='JPEG')
        return tmp_file.name

def warm_up_model():
    """Warm up the model with a dummy inference to eliminate cold start"""
    if model is None or tokenizer is None:
        logger.warning("Cannot warm up: model not loaded")
        return

    logger.info("Warming up model with dummy inference...")

    try:
        # Create dummy image
        dummy_image_path = create_dummy_image()

        # Run a quick inference
        output_dir = tempfile.mkdtemp()
        prompt = "<image>\nExtract text from this image."

        _ = model.infer(
            tokenizer,
            prompt=prompt,
            image_file=dummy_image_path,
            output_path=output_dir,
            base_size=1024,
            image_size=640,
            crop_mode=True,
            save_results=False,
            test_compress=True
        )

        # Clean up
        if os.path.exists(dummy_image_path):
            os.unlink(dummy_image_path)

        logger.info("Model warm-up completed successfully ✓")

    except Exception as e:
        logger.warning(f"Model warm-up failed (non-critical): {e}")

def compute_image_hash(image_data: bytes) -> str:
    """Compute SHA256 hash of image data for caching"""
    return hashlib.sha256(image_data).hexdigest()

def get_cached_result(image_hash: str) -> Optional[Dict[str, Any]]:
    """Get cached OCR result if available"""
    return ocr_cache.get(image_hash)

def cache_result(image_hash: str, result: Dict[str, Any]):
    """Cache OCR result with LRU eviction (max 50 entries)"""
    global ocr_cache

    # Simple LRU: if cache is full, remove oldest entry
    if len(ocr_cache) >= 50:
        # Remove first (oldest) entry
        oldest_key = next(iter(ocr_cache))
        del ocr_cache[oldest_key]

    ocr_cache[image_hash] = result

def parse_markdown_menu(markdown_text: str) -> Dict[str, Any]:
    """
    Parse markdown output from DeepSeek-OCR into structured menu data.
    This function attempts to extract menu items, prices, and categories from markdown.
    """
    menu_items = []
    restaurant_name = None
    current_category = None

    lines = markdown_text.split('\n')

    for line in lines:
        line = line.strip()

        # Skip empty lines
        if not line:
            continue

        # Try to extract restaurant name from first heading
        if line.startswith('# ') and restaurant_name is None:
            restaurant_name = line[2:].strip()
            continue

        # Category detection (headings)
        if line.startswith('## '):
            current_category = line[3:].strip()
            continue

        # Try to parse table rows (markdown tables)
        if '|' in line and not line.startswith('|--'):
            # Remove leading/trailing pipes and split
            parts = [p.strip() for p in line.split('|') if p.strip()]

            if len(parts) >= 2:
                # Assume first column is name, last column might be price
                name = parts[0]
                description = parts[1] if len(parts) > 2 else None
                price = parts[-1] if len(parts) > 1 else None

                # Check if last part looks like a price
                price_pattern = r'[\$€£¥₹]\s*\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s*[\$€£¥₹]'
                if price and not re.search(price_pattern, price):
                    # Not a price, treat as description
                    description = price
                    price = None

                if name and not name.lower() in ['name', 'item', 'dish', 'product']:
                    menu_items.append({
                        "name": name,
                        "description": description,
                        "price": price,
                        "category": current_category
                    })

        # Try to parse list items (- or *)
        elif line.startswith(('- ', '* ')):
            item_text = line[2:].strip()

            # Try to split name, description, and price
            # Common patterns: "Name - Description - $10.00" or "Name $10.00"
            price_pattern = r'([\$€£¥₹]\s*\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s*[\$€£¥₹])'
            price_match = re.search(price_pattern, item_text)

            if price_match:
                price = price_match.group(1)
                # Everything before price
                rest = item_text[:price_match.start()].strip()

                # Try to split name and description by common separators
                parts = re.split(r'\s*[-–—:]\s*', rest, maxsplit=1)
                name = parts[0]
                description = parts[1] if len(parts) > 1 else None

                menu_items.append({
                    "name": name,
                    "description": description,
                    "price": price,
                    "category": current_category
                })
            else:
                # No price found, treat entire line as name
                menu_items.append({
                    "name": item_text,
                    "description": None,
                    "price": None,
                    "category": current_category
                })

    return {
        "menuItems": menu_items,
        "restaurantName": restaurant_name,
        "rawText": markdown_text
    }

@app.on_event("startup")
async def startup_event():
    """Load model on startup and warm it up"""
    load_model()
    warm_up_model()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model": "deepseek-ai/DeepSeek-OCR",
        "service": "DeepSeek-OCR Service"
    }

@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "cache_size": len(ocr_cache)
    }

@app.get("/health/warm")
async def health_warm():
    """
    Keep-alive endpoint that touches the model to keep it warm.
    Call this periodically to prevent cold starts.
    """
    if model is None or tokenizer is None:
        return {"status": "model_not_loaded", "warm": False}

    # Just return status - model is already warm from startup
    return {
        "status": "warm",
        "model_loaded": True,
        "cache_entries": len(ocr_cache)
    }

@app.get("/cache/stats")
async def cache_stats():
    """Get cache statistics"""
    return {
        "cache_size": len(ocr_cache),
        "max_cache_size": 50,
        "cache_utilization": f"{(len(ocr_cache) / 50) * 100:.1f}%"
    }

@app.post("/api/generate", response_model=OCRResponse)
async def generate_ocr(request: OCRRequest):
    """
    OCR endpoint compatible with Ollama's API format.
    Accepts base64 encoded images and returns structured menu data.
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image)

        # Check cache first
        image_hash = compute_image_hash(image_data)
        cached_result = get_cached_result(image_hash)

        if cached_result:
            logger.info(f"Cache hit for image {image_hash[:8]}...")
            return OCRResponse(**cached_result)

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            tmp_file.write(image_data)
            tmp_file_path = tmp_file.name

        try:
            # Prepare prompt
            if request.prompt:
                prompt = request.prompt
            else:
                # Default prompt for menu extraction
                prompt = "<image>\n<|grounding|>Convert this menu to markdown. Extract all menu items with their names, descriptions, and prices. Organize by categories if visible."

            # Create output directory
            output_dir = tempfile.mkdtemp()

            # Run inference
            logger.info(f"Running inference on image...")
            result = model.infer(
                tokenizer,
                prompt=prompt,
                image_file=tmp_file_path,
                output_path=output_dir,
                base_size=request.base_size,
                image_size=request.image_size,
                crop_mode=request.crop_mode,
                save_results=True,
                test_compress=request.test_compress
            )

            # Parse the result
            # The result should contain the generated text
            markdown_text = result if isinstance(result, str) else str(result)

            # Parse markdown into structured menu data
            parsed_data = parse_markdown_menu(markdown_text)

            # Create response
            response_data = {
                "menuItems": [MenuItem(**item) for item in parsed_data["menuItems"]],
                "restaurantName": parsed_data.get("restaurantName"),
                "rawText": parsed_data["rawText"],
                "enhancedStructure": None,
                "debug": {
                    "model": "deepseek-ai/DeepSeek-OCR",
                    "prompt_used": prompt,
                    "items_found": len(parsed_data["menuItems"]),
                    "cached": False
                }
            }

            # Cache the result
            cache_result(image_hash, response_data)
            logger.info(f"Cached result for image {image_hash[:8]}...")

            return OCRResponse(**response_data)

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)

    except Exception as e:
        logger.error(f"Error during OCR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ocr/upload", response_model=OCRResponse)
async def upload_ocr(file: UploadFile = File(...)):
    """
    Optimized endpoint that accepts binary file uploads directly.
    Avoids base64 encoding/decoding overhead for better performance.
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Read file content as bytes
        image_data = await file.read()

        # Check cache first
        image_hash = compute_image_hash(image_data)
        cached_result = get_cached_result(image_hash)

        if cached_result:
            logger.info(f"Cache hit for uploaded file {image_hash[:8]}...")
            # Add cached flag to debug info
            cached_result["debug"]["cached"] = True
            return OCRResponse(**cached_result)

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            tmp_file.write(image_data)
            tmp_file_path = tmp_file.name

        try:
            # Default prompt for menu extraction
            prompt = "<image>\n<|grounding|>Extract this menu and convert to structured data. Include all menu items with their names, descriptions, and prices. Organize by categories if visible. Format the restaurant name clearly at the top."

            # Create output directory
            output_dir = tempfile.mkdtemp()

            # Run inference
            logger.info("Running inference on uploaded image...")
            result = model.infer(
                tokenizer,
                prompt=prompt,
                image_file=tmp_file_path,
                output_path=output_dir,
                base_size=1024,
                image_size=640,
                crop_mode=True,
                save_results=True,
                test_compress=True
            )

            # Parse the result
            markdown_text = result if isinstance(result, str) else str(result)

            # Parse markdown into structured menu data
            parsed_data = parse_markdown_menu(markdown_text)

            # Create response
            response_data = {
                "menuItems": [MenuItem(**item) for item in parsed_data["menuItems"]],
                "restaurantName": parsed_data.get("restaurantName"),
                "rawText": parsed_data["rawText"],
                "enhancedStructure": None,
                "debug": {
                    "model": "deepseek-ai/DeepSeek-OCR",
                    "prompt_used": prompt,
                    "items_found": len(parsed_data["menuItems"]),
                    "cached": False,
                    "upload_method": "binary"
                }
            }

            # Cache the result
            cache_result(image_hash, response_data)
            logger.info(f"Cached result for uploaded image {image_hash[:8]}...")

            return OCRResponse(**response_data)

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)

    except Exception as e:
        logger.error(f"Error during file upload OCR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
