import boto3
import cv2
import numpy as np
import os
import logging
import json
from urllib.parse import unquote_plus

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

def lambda_handler(event, context):
    # Config
    THUMBNAIL_SIZE = (128, 128)
    THUMBNAIL_PREFIX = 'thumbnails/'
    
    try:
        # Get uploaded file info
        record = event['Records'][0]
        bucket = record['s3']['bucket']['name']
        # Handle spaces/special characters in filenames
        key = unquote_plus(record['s3']['object']['key'])

        logger.info(f"Processing: {key} from {bucket}")

        # --- CRITICAL FIX: Prevent Infinite Loops ---
        # If the file is already a thumbnail, STOP immediately.
        if key.startswith(THUMBNAIL_PREFIX) or "-thumb.jpg" in key:
            logger.info("Skipping: File is already a thumbnail.")
            return {
                'statusCode': 200,
                'body': json.dumps('Skipped thumbnail file')
            }

        # Only handle image files
        if not key.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp')):
            logger.info(f"Skipped non-image file: {key}")
            return {'statusCode': 200, 'body': json.dumps('Skipped non-image')}

        # Download original
        local_path = f"/tmp/{os.path.basename(key)}"
        s3.download_file(bucket, key, local_path)

        # Process with OpenCV
        image = cv2.imread(local_path)
        if image is None:
            raise Exception("OpenCV failed to read image")

        # Resize
        thumbnail = resize_with_aspect_ratio(image, THUMBNAIL_SIZE)

        # Encode
        success, buffer = cv2.imencode('.jpg', thumbnail)
        if not success:
            raise Exception("Compression failed")
        thumbnail_bytes = buffer.tobytes()

        # Construct new Key
        original_name = os.path.basename(key)
        # Use the same bucket as the source (Dynamic, not hardcoded)
        dest_bucket = bucket 
        thumb_key = f"{THUMBNAIL_PREFIX}{os.path.splitext(original_name)[0]}-thumb.jpg"

        # Upload
        s3.put_object(
            Bucket=dest_bucket,
            Key=thumb_key,
            Body=thumbnail_bytes,
            ContentType='image/jpeg',
            Metadata={'original-image': key}
        )

        logger.info(f"Success: s3://{dest_bucket}/{thumb_key}")
        
        # Cleanup
        if os.path.exists(local_path):
            os.remove(local_path)
        
        return {'statusCode': 200, 'body': json.dumps('Thumbnail success')}

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps(str(e))}

def resize_with_aspect_ratio(image, target_size):
    h, w = image.shape[:2]
    max_w, max_h = target_size
    scale = min(max_w / w, max_h / h)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)