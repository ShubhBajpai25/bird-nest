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

# Initialize DynamoDB table
media_table = dynamodb.Table('MediaFiles')

def lambda_handler(event, context):
    """
    Lambda handler for S3 event-driven bird detection with DynamoDB storage
    """
    try:
        # Parse S3 event
        for record in event['Records']:
            # Get bucket and object key from S3 event
            bucket_name = record['s3']['bucket']['name']
            object_key = unquote_plus(record['s3']['object']['key'])
            
            logger.info(f"Processing file: {object_key} from bucket: {bucket_name}")
            
            # Process the uploaded file
            result = process_s3_file(bucket_name, object_key)
            
            logger.info(f"Processing completed for {object_key}")
            
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Bird detection completed successfully',
                'processed_files': len(event['Records'])
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing S3 event: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }

def process_s3_file(bucket_name, object_key):
    """
    Download file from S3, run bird detection, store results in DynamoDB
    """
    # Configuration - you can set these as environment variables
    MODEL_BUCKET = os.environ.get('MODEL_BUCKET', bucket_name)  # Default to same bucket
    MODEL_KEY = os.environ.get('MODEL_KEY', 'model/model.pt')
    CONFIDENCE_THRESHOLD = float(os.environ.get('CONFIDENCE_THRESHOLD', '0.5'))
    
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # 1. Download the model from S3
            model_path = os.path.join(temp_dir, 'model.pt')
            logger.info(f"Downloading model from s3://{MODEL_BUCKET}/{MODEL_KEY}")
            s3_client.download_file(MODEL_BUCKET, MODEL_KEY, model_path)
            logger.info("Model downloaded successfully")
            
            # 2. Download the input file from S3
            input_path = os.path.join(temp_dir, os.path.basename(object_key))
            logger.info(f"Downloading input file: {object_key}")
            s3_client.download_file(bucket_name, object_key, input_path)
            logger.info("Input file downloaded successfully")
            
            # 3. Create output directory
            output_dir = os.path.join(temp_dir, 'output')
            os.makedirs(output_dir, exist_ok=True)
            
            # 4. Run bird detection
            logger.info("Starting bird detection...")
            detection_results = detect_birds_in_file(
                input_path=input_path,
                output_dir=output_dir,
                confidence=CONFIDENCE_THRESHOLD,
                model_path=model_path
            )
            logger.info(f"Bird detection completed: {detection_results}")
            
            # 5. Determine file type
            file_extension = os.path.splitext(object_key)[1].lower()
            file_type = determine_file_type(file_extension)
            
            # 6. Create S3 URL for the processed file
            s3_url = f"https://{bucket_name}.s3.amazonaws.com/{object_key}"
            
            # 7. Process detection results and store in DynamoDB
            tags = process_detection_results(detection_results)
            
            # 8. Handle thumbnail for images (leave empty for now)
            thumbnail_s3_url = None
            
            # 9. Store results in DynamoDB
            store_results_in_dynamodb(s3_url, thumbnail_s3_url, file_type, tags)
            
            # 10. Return results
            result = {
                's3_url': s3_url,
                'file_type': file_type,
                'tags': tags,
                'detection_summary': detection_results
            }
            
            if thumbnail_s3_url:
                result['thumbnail_s3_url'] = thumbnail_s3_url
                
            return result
            
        except Exception as e:
            logger.error(f"Error processing file {object_key}: {str(e)}")
            raise

def determine_file_type(file_extension):
    """
    Determine if file is image or video based on extension
    """
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'}
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'}
    
    if file_extension in image_extensions:
        return "image"
    elif file_extension in video_extensions:
        return "video"
    else:
        return "unknown"

def process_detection_results(detection_results):
    """
    Convert detection results to tags format expected by DynamoDB
    Expected format: {"species_name": count, ...}
    """
    tags = {}
    
    # This depends on the format returned by your detect_birds_in_file function
    # Adjust this logic based on your actual detection results structure
    
    if isinstance(detection_results, dict):
        # If detection_results has a 'detections' or similar key
        detections = detection_results.get('detections', [])
        
        # Count occurrences of each species
        for detection in detections:
            if isinstance(detection, dict):
                species = detection.get('class', detection.get('species', 'unknown'))
                if species in tags:
                    tags[species] += 1
                else:
                    tags[species] = 1
    
    elif isinstance(detection_results, list):
        # If detection_results is directly a list of detections
        for detection in detection_results:
            if isinstance(detection, dict):
                species = detection.get('class', detection.get('species', 'unknown'))
                if species in tags:
                    tags[species] += 1
                else:
                    tags[species] = 1
    
    # Remove 'unknown' species if present and no actual species found
    if 'unknown' in tags and len(tags) > 1:
        del tags['unknown']
    
    return tags

def store_results_in_dynamodb(s3_url, thumbnail_s3_url, file_type, tags):
    """
    Store detection results in DynamoDB MediaFiles table
    """
    try:
        # Build media item
        media_item = {
            's3_url': s3_url,
            'file_type': file_type
        }

        if thumbnail_s3_url:
            media_item['thumbnail_s3_url'] = thumbnail_s3_url
        
        if tags:
            media_item['tags'] = tags

        # Store in MediaFiles table
        logger.info(f"Storing media item in DynamoDB: {s3_url}")
        media_table.put_item(Item=media_item)

        logger.info("Successfully stored results in DynamoDB")

    except Exception as e:
        logger.error(f"Error storing results in DynamoDB: {str(e)}")
        raise

def test_handler():
    """
    Test function for local development
    """
    # Example S3 event structure
    test_event = {
        "Records": [
            {
                "s3": {
                    "bucket": {"name": "your-test-bucket"},
                    "object": {"key": "input/test_image.jpg"}
                }
            }
        ]
    }
    
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    # For local testing
    test_handler()