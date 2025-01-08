from appwrite.client import Client
from appwrite.services.storage import Storage
from appwrite.input_file import InputFile
from appwrite.exception import AppwriteException
import easyocr
import os
import tempfile

# Initialize EasyOCR reader
def extract_text_from_image(image_path, languages=['en']):
    reader = easyocr.Reader(languages)
    result = reader.readtext(image_path)
    extracted_text = [detection[1] for detection in result]
    return extracted_text

# Main function
def main(context):
    # Initialize Appwrite client
    client = (
        Client()
        .set_endpoint(os.environ["APPWRITE_FUNCTION_API_ENDPOINT"])
        .set_project(os.environ["APPWRITE_FUNCTION_PROJECT_ID"])
        .set_key(context.req.headers["x-appwrite-key"])
    )

    # Parse the request payload
    try:
        payload = context.req.body
        image_file_id = payload.get("imageFileId")
        language = payload.get("language", "en")

        if not image_file_id:
            return context.res.json({
                "status": "error",
                "message": "imageFileId is required in the payload."
            }, 400)

        # Download the image file from Appwrite Storage
        storage = Storage(client)
        image_file = storage.get_file_download(image_file_id)

        # Save the image to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
            temp_file.write(image_file)
            temp_image_path = temp_file.name

        # Extract text from the image
        extracted_text = extract_text_from_image(temp_image_path, languages=[language])

        # Clean up the temporary file
        os.remove(temp_image_path)

        # Return the extracted text
        return context.res.json({
            "status": "success",
            "extractedText": extracted_text
        })

    except AppwriteException as e:
        context.error(f"Appwrite error: {str(e)}")
        return context.res.json({
            "status": "error",
            "message": str(e)
        }, 500)
    except Exception as e:
        context.error(f"Unexpected error: {str(e)}")
        return context.res.json({
            "status": "error",
            "message": str(e)
        }, 500)