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
    # Configuration
    MODEL_BUCKET = os.environ.get('MODEL_BUCKET', bucket_name)
    MODEL_KEY = os.environ.get('MODEL_KEY', 'models/model.pt')
    CONFIDENCE = float(os.environ.get('CONFIDENCE_THRESHOLD', '0.5'))
    
    # 1. OPTIMIZATION: Check /tmp cache first for the model
    # This prevents re-downloading the 50MB model on every run (Warm Start)
    model_path = '/tmp/model.pt'
    if not os.path.exists(model_path):
        logger.info(f"Downloading model from {MODEL_BUCKET}/{MODEL_KEY}...")
        s3_client.download_file(MODEL_BUCKET, MODEL_KEY, model_path)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # 2. Download the Media File
        input_filename = os.path.basename(object_key)
        input_path = os.path.join(temp_dir, input_filename)
        logger.info(f"Downloading media file: {object_key}")
        s3_client.download_file(bucket_name, object_key, input_path)
        
        # 3. Run Detection (This calls your detect_birds.py)
        output_dir = os.path.join(temp_dir, 'output')
        results = detect_birds_in_file(
            input_path=input_path,
            output_dir=output_dir,
            confidence=CONFIDENCE,
            model_path=model_path
        )
        
        # --- THE LOGIC FIX IS HERE ---
        # Old code looked for 'detections' list.
        # New code correctly grabs the 'birds' dictionary your script returns.
        tags = results.get('birds', {})
        file_type = results.get('file_type', 'unknown')
        
        # 4. Predict the Thumbnail URL
        # Since we use a separate Lambda for thumbnails, we predict the URL 
        # so the frontend works immediately without waiting for the other Lambda.
        s3_url = f"https://{bucket_name}.s3.amazonaws.com/{object_key}"
        
        thumbnail_url = None
        if file_type == 'image':
            filename_no_ext = os.path.splitext(input_filename)[0]
            # Must match the naming convention in your Thumbnail Lambda
            thumbnail_key = f"thumbnails/{filename_no_ext}-thumb.jpg"
            thumbnail_url = f"https://{bucket_name}.s3.amazonaws.com/{thumbnail_key}"

        # 5. Store in DynamoDB
        item = {
            's3_url': s3_url,
            'file_type': file_type,
            'tags': tags
        }
        # Only add thumbnail field if it exists
        if thumbnail_url:
            item['thumbnail_s3_url'] = thumbnail_url
            
        media_table.put_item(Item=item)
        logger.info(f"Successfully tagged {object_key}: {tags}")