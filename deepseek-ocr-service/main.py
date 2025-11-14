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
    """Load model on startup"""
    load_model()

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
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
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

            return OCRResponse(
                menuItems=[MenuItem(**item) for item in parsed_data["menuItems"]],
                restaurantName=parsed_data.get("restaurantName"),
                rawText=parsed_data["rawText"],
                enhancedStructure=None,
                debug={
                    "model": "deepseek-ai/DeepSeek-OCR",
                    "prompt_used": prompt,
                    "items_found": len(parsed_data["menuItems"])
                }
            )

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)

    except Exception as e:
        logger.error(f"Error during OCR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ocr/upload")
async def upload_ocr(file: UploadFile = File(...)):
    """
    Alternative endpoint that accepts file uploads directly.
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Read file content
        content = await file.read()

        # Encode to base64
        base64_image = base64.b64encode(content).decode('utf-8')

        # Use the generate endpoint
        request = OCRRequest(image=base64_image)
        return await generate_ocr(request)

    except Exception as e:
        logger.error(f"Error during file upload OCR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
