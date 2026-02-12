import boto3
import cv2
import numpy as np
import os
import logging
import json
import tempfile
from urllib.parse import unquote_plus
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME', 'MediaFiles')
table = dynamodb.Table(TABLE_NAME)

def resize_with_aspect_ratio(image, target_size):
    h, w = image.shape[:2]
    max_w, max_h = target_size
    scale = min(max_w / w, max_h / h)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

def extract_video_frame(video_path):
    """
    Captures the first valid frame from a video file.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None
    
    # Optional: Read frame at 1 second mark (usually better than 0s which might be black)
    # fps = cap.get(cv2.CAP_PROP_FPS)
    # cap.set(cv2.CAP_PROP_POS_FRAMES, fps * 1) 

    ret, frame = cap.read()
    cap.release()
    
    if ret:
        return frame
    return None

def lambda_handler(event, context):
    THUMBNAIL_SIZE = (128, 128)
    THUMBNAIL_PREFIX = 'thumbnails/'
    
    # Supported Extensions
    IMG_EXTS = ('.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp')
    VID_EXTS = ('.mp4', '.mov', '.avi', '.mkv', '.webm')
    
    try:
        for record in event['Records']:
            if record['eventName'] not in ['INSERT', 'MODIFY']:
                continue
            
            new_image = record['dynamodb']['NewImage']
            
            # Anti-Loop Check
            if 'thumbnail_s3_url' in new_image:
                logger.info("Skipping: Thumbnail already exists.")
                continue

            s3_url = new_image['s3_url']['S']
            
            # Parse S3 URL
            try:
                clean_url = s3_url.replace("https://", "").replace("http://", "")
                bucket_part, key_part = clean_url.split('.s3.amazonaws.com/', 1)
                bucket = bucket_part
                key = unquote_plus(key_part)
            except Exception as e:
                logger.error(f"Could not parse URL {s3_url}: {e}")
                continue

            logger.info(f"Processing: {key}")

            # Determine Mode
            is_image = key.lower().endswith(IMG_EXTS)
            is_video = key.lower().endswith(VID_EXTS)

            if not (is_image or is_video):
                logger.info(f"Skipping unsupported file type: {key}")
                continue

            # Download to /tmp
            local_path = f"/tmp/{os.path.basename(key)}"
            s3.download_file(bucket, key, local_path)

            # EXTRACT IMAGE DATA
            image = None
            if is_image:
                image = cv2.imread(local_path)
            elif is_video:
                logger.info("Extracting frame from video...")
                image = extract_video_frame(local_path)

            if image is None:
                logger.error(f"Failed to read image data from {key}")
                if os.path.exists(local_path): os.remove(local_path)
                continue

            # Resize & Encode
            thumbnail = resize_with_aspect_ratio(image, THUMBNAIL_SIZE)
            success, buffer = cv2.imencode('.jpg', thumbnail)
            thumbnail_bytes = buffer.tobytes()

            # Upload Thumbnail
            original_name = os.path.basename(key)
            filename_no_ext = os.path.splitext(original_name)[0]
            thumb_key = f"{THUMBNAIL_PREFIX}{filename_no_ext}-thumb.jpg"

            s3.put_object(
                Bucket=bucket,
                Key=thumb_key,
                Body=thumbnail_bytes,
                ContentType='image/jpeg',
                Metadata={'original-media': key}
            )

            # Update DynamoDB
            thumb_s3_url = f"https://{bucket}.s3.amazonaws.com/{thumb_key}"
            
            table.update_item(
                Key={'s3_url': s3_url},
                UpdateExpression="SET thumbnail_s3_url = :t, updated_at = :u",
                ExpressionAttributeValues={
                    ':t': thumb_s3_url,
                    ':u': datetime.utcnow().isoformat()
                }
            )
            logger.info(f"SUCCESS: Generated {thumb_s3_url}")

            # Cleanup
            if os.path.exists(local_path): os.remove(local_path)

        return {'statusCode': 200, 'body': json.dumps('Batch processed')}

    except Exception as e:
        logger.error(f"Fatal Error: {str(e)}")
        return {'statusCode': 200, 'body': json.dumps('Error handled')}