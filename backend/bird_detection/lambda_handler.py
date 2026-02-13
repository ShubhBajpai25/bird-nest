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

    logger.info(f"🔍 INSPECTING METADATA for {object_key}")
    user_id = 'anonymous-user' 
    
    try:
        response = s3_client.head_object(Bucket=bucket_name, Key=object_key)
        raw_metadata = response.get('Metadata', {})
        
        # DEBUG: This will show you exactly what keys are present in CloudWatch
        logger.info(f"RAW METADATA KEYS FOUND: {list(raw_metadata.keys())}")
        
        # Standardize: Find the value regardless of 'x-amz-meta-' prefix or casing
        for k, v in raw_metadata.items():
            # S3 often returns 'userid' or 'x-amz-meta-userid'
            clean_key = k.lower().replace('x-amz-meta-', '')
            if clean_key == 'userid':
                user_id = v
                logger.info(f"🎯 MATCH FOUND! User ID is: {user_id}")
                break
            
    except Exception as e:
        logger.error(f"❌ METADATA EXTRACTION FAILED: {str(e)}")
    
    # 2. OPTIMIZATION: Check /tmp cache first for the model
    model_path = '/tmp/model.pt'
    if not os.path.exists(model_path):
        logger.info(f"Downloading model from {MODEL_BUCKET}/{MODEL_KEY}...")
        s3_client.download_file(MODEL_BUCKET, MODEL_KEY, model_path)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # 3. Download the Media File
        input_filename = os.path.basename(object_key)
        input_path = os.path.join(temp_dir, input_filename)
        logger.info(f"Downloading media file: {object_key}")
        s3_client.download_file(bucket_name, object_key, input_path)
        
        # 4. Run Detection
        output_dir = os.path.join(temp_dir, 'output')
        results = detect_birds_in_file(
            input_path=input_path,
            output_dir=output_dir,
            confidence=CONFIDENCE,
            model_path=model_path
        )

        # (Deleted duplicate metadata extraction block here)
        
        # 5. Get detection results
        tags = results.get('birds', {})
        file_type = results.get('file_type', 'unknown')
            
        # 6. Predict the Thumbnail URL
        s3_url = f"https://{bucket_name}.s3.amazonaws.com/{object_key}"
        
        thumbnail_url = None
        if file_type == 'image':
            filename_no_ext = os.path.splitext(input_filename)[0]
            thumbnail_key = f"thumbnails/{filename_no_ext}-thumb.jpg"
            thumbnail_url = f"https://{bucket_name}.s3.amazonaws.com/{thumbnail_key}"

        # 7. Store in DynamoDB
        item = {
            's3_url': s3_url,
            'user_id': user_id,  # Uses the variable from step 1
            'file_type': file_type,
            'tags': tags
        }
        
        if thumbnail_url:
            item['thumbnail_s3_url'] = thumbnail_url
            
        # Clean up item to remove None values just in case
        item = {k: v for k, v in item.items() if v is not None}

        media_table.put_item(Item=item)
        logger.info(f"Successfully tagged {object_key} for User {user_id}: {tags}")