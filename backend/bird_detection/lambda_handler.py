import json
import boto3
import os
import tempfile
from urllib.parse import unquote_plus
import logging
from detect_birds import detect_birds_in_file

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Use environment variable for table name, fallback to 'MediaFiles'
TABLE_NAME = os.environ.get('TABLE_NAME', 'MediaFiles')
media_table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    try:
        processed_count = 0
        for record in event['Records']:
            bucket_name = record['s3']['bucket']['name']
            object_key = unquote_plus(record['s3']['object']['key'])
            
            logger.info(f"Processing file: {object_key} from bucket: {bucket_name}")
            
            # Run the logic
            process_s3_file(bucket_name, object_key)
            processed_count += 1
            
        return {
            'statusCode': 200, 
            'body': json.dumps({'message': 'Success', 'processed': processed_count})
        }
        
    except Exception as e:
        logger.error(f"Error processing batch: {str(e)}")
        # Return 500 so Lambda knows to retry if needed
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

def process_s3_file(bucket_name, object_key):
    # --- 1. CONFIG & CACHING ---
    MODEL_BUCKET = os.environ.get('MODEL_BUCKET', bucket_name)
    MODEL_KEY = os.environ.get('MODEL_KEY', 'models/model.pt')
    CONFIDENCE = float(os.environ.get('CONFIDENCE_THRESHOLD', '0.5'))
    
    model_path = '/tmp/model.pt'
    if not os.path.exists(model_path):
        logger.info(f"Downloading model from {MODEL_BUCKET}/{MODEL_KEY}...")
        s3_client.download_file(MODEL_BUCKET, MODEL_KEY, model_path)

    # --- 2. THE SIMPLE BRIDGE ---
    # We skip all head_object/metadata calls to save time and avoid race conditions.
    user_id = 'anonymous-user'

    # --- 3. DOWNLOAD & DETECT ---
    with tempfile.TemporaryDirectory() as temp_dir:
        input_filename = os.path.basename(object_key)
        input_path = os.path.join(temp_dir, input_filename)
        s3_client.download_file(bucket_name, object_key, input_path)
        
        output_dir = os.path.join(temp_dir, 'output')
        results = detect_birds_in_file(
            input_path=input_path,
            output_dir=output_dir,
            confidence=CONFIDENCE,
            model_path=model_path
        )

        tags = results.get('birds', {})
        file_type = results.get('file_type', 'unknown')
            
        # --- 4. STANDARDIZED URL ---
        # Hardcoding 's3.amazonaws.com' ensures it matches the frontend's normalized search.
        s3_url = f"https://{bucket_name}.s3.amazonaws.com/{object_key}"
        
        thumbnail_url = None
        if file_type == 'image':
            filename_no_ext = os.path.splitext(input_filename)[0]
            thumbnail_url = f"https://{bucket_name}.s3.amazonaws.com/thumbnails/{filename_no_ext}-thumb.jpg"

        # --- 5. DYNAMODB SYNC ---
        item = {
            's3_url': s3_url,
            'user_id': user_id, # Always anonymous for the worker
            'file_type': file_type,
            'tags': tags
        }
        if thumbnail_url:
            item['thumbnail_s3_url'] = thumbnail_url
            
        media_table.put_item(Item={k: v for k, v in item.items() if v is not None})
        logger.info(f"✅ SYNCED: {object_key} as anonymous. Tags: {tags}")