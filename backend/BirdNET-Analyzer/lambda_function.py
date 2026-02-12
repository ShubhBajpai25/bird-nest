import csv
import json
import boto3
import os
import shutil
from urllib.parse import unquote_plus
import logging
# Import the analyze function from your local folder
from birdnet_analyzer.analyze.core import analyze
from birdnet_analyzer import config as cfg

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME', 'MediaFiles')
media_table = dynamodb.Table(TABLE_NAME)

s3_client = boto3.client('s3')

def lambda_handler(event, context):
    # Load config from Env Vars
    cfg.MODEL_PATH = os.environ["MODEL_PATH"]
    cfg.MDATA_MODEL_PATH = os.environ["MDATA_MODEL_PATH"]
    cfg.LABELS_FILE = os.environ["LABELS_FILE"]
    
    # LIMIT THREADS (Crucial for Lambda)
    # TensorFlow will try to use all cores and might get throttled
    cfg.CPU_THREADS = 1
    cfg.TFLITE_THREADS = 1

    processed_count = 0

    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])
        
        logger.info(f"Processing audio: {key}")

        # Define paths in /tmp
        local_filename = os.path.basename(key)
        local_wav = os.path.join("/tmp", local_filename)
        output_dir = "/tmp/output"
        
        # Clear previous run data
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        os.makedirs(output_dir, exist_ok=True)

        try:
            # 1. Download
            s3_client.download_file(bucket, key, local_wav)
            
            # 2. Analyze
            # This writes a CSV file into output_dir
            analyze(
                audio_input=local_wav,
                output_dir=output_dir,
                rtype="csv",
                threads=1
            )

            # 3. Parse Results
            tags = {}
            # Find the generated CSV file
            for f in os.listdir(output_dir):
                if f.endswith('.csv'):
                    path = os.path.join(output_dir, f)
                    with open(path, mode='r', encoding='utf-8') as csvfile:
                        reader = csv.DictReader(csvfile)
                        for row in reader:
                            # Check different column name possibilities
                            name = row.get("Common name") or row.get("Common Name")
                            conf = float(row.get("Confidence", 0))
                            
                            if name and conf > 0.4: # Filter weak predictions
                                tags[name] = tags.get(name, 0) + 1
            
            logger.info(f"Tags found: {tags}")

            # 4. Save to DynamoDB
            s3_url = f"https://{bucket}.s3.amazonaws.com/{key}"
            item = {
                's3_url': s3_url,
                'file_type': 'audio',
                'tags': tags
            }
            media_table.put_item(Item=item)
            processed_count += 1

        except Exception as e:
            logger.error(f"Failed to process {key}: {e}")
            continue

    return {
        'statusCode': 200,
        'body': json.dumps(f'Processed {processed_count} audio files.')
    }