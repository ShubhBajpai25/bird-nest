import boto3
import cv2
import numpy as np
import os
import logging
import json

def lambda_handler(event, context):
    # Initialize logging inside the handler
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Initialize S3 client inside handler
    s3 = boto3.client('s3')
    
    # Config
    THUMBNAIL_SIZE = (128, 128)
    THUMBNAIL_PREFIX = 'thumbnails/'
    DEST_BUCKET = 'original-files-buck'
    
    try:
        logger.info("Lambda triggered")
        logger.info("Received event: %s", json.dumps(event))

        # Get uploaded file info from S3 trigger
        record = event['Records'][0]
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Only handle image files
        if not key.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.gif')):
            logger.info(f"Skipped non-image file: {key}")
            return {
                'statusCode': 200,
                'body': json.dumps(f'Skipped non-image file: {key}')
            }

        # Download the original image
        local_path = f"/tmp/{os.path.basename(key)}"
        logger.info(f"Downloading s3://{bucket}/{key} to {local_path}")
        s3.download_file(bucket, key, local_path)

        # Load image using OpenCV
        image = cv2.imread(local_path)
        if image is None:
            raise Exception("OpenCV failed to read image")

        # Resize
        thumbnail = resize_with_aspect_ratio(image, THUMBNAIL_SIZE)

        # Encode thumbnail as JPEG
        success, buffer = cv2.imencode('.jpg', thumbnail)
        if not success:
            raise Exception("OpenCV failed to encode thumbnail")

        thumbnail_bytes = buffer.tobytes()

        # Prepare new key in thumbnail folder
        original_name = os.path.basename(key)
        thumb_key = f"{THUMBNAIL_PREFIX}{original_name.rsplit('.', 1)[0]}-thumb.jpg"

        # Upload thumbnail to same bucket in thumbnail folder
        s3.put_object(
            Bucket=DEST_BUCKET,
            Key=thumb_key,
            Body=thumbnail_bytes,
            ContentType='image/jpeg',
            Metadata={
                'original-image': key
            }
        )

        logger.info(f"Thumbnail uploaded to: s3://{DEST_BUCKET}/{thumb_key}")
        
        # Clean up temporary file
        if os.path.exists(local_path):
            os.remove(local_path)
        
        return {
            'statusCode': 200,
            'body': json.dumps(f'Thumbnail created successfully: {thumb_key}')
        }

    except Exception as e:
        logger.error(f"Error in thumbnail generation: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }

def resize_with_aspect_ratio(image, target_size):
    """
    Resize image while preserving aspect ratio
    """
    h, w = image.shape[:2]
    max_w, max_h = target_size
    scale = min(max_w / w, max_h / h)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)