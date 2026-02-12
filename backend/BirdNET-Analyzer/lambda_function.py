import json
import boto3
import os
import shutil
import glob
from urllib.parse import unquote_plus
import logging

# Import official analyzer
from birdnet_analyzer.analyze import analyze
from birdnet_analyzer import config as cfg

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME', 'MediaFiles')
media_table = dynamodb.Table(TABLE_NAME)
s3_client = boto3.client('s3')

class Args:
    def __init__(self, i, o, m, l):
        self.i = i
        self.o = o
        self.model = m # Path to .tflite file
        self.labels = l # Path to labels .txt
        self.min_conf = 0.4
        self.sensitivity = 1.0
        self.overlap = 0.0
        self.rtype = 'csv'
        self.threads = 1
        self.batch_size = 1
        self.locale = 'en'
        self.sf_thresh = 0.03
        self.fmin = 0
        self.fmax = 15000
        self.lat = -1
        self.lon = -1
        self.week = -1
        self.slist = ''

def lambda_handler(event, context):
    # 1. REDIRECT ALL WRITES TO /TMP
    # Numba and other audio libs need this for caching
    os.environ['NUMBA_CACHE_DIR'] = '/tmp'
    
    # 2. OVERRIDE BIRDNET CONFIG
    # This prevents the library from trying to create '/var/task/birdnet_analyzer/checkpoints'
    cfg.MODEL_PATH = os.environ.get("MODEL_PATH")
    cfg.LABELS_FILE = os.environ.get("LABELS_FILE")
    cfg.CPU_THREADS = 1
    cfg.TFLITE_THREADS = 1

    processed_count = 0

    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])
        logger.info(f"Processing: {key}")

        local_filename = os.path.basename(key)
        local_wav = os.path.join("/tmp", local_filename)
        
        # We must use a unique subfolder in /tmp for the analyzer output
        output_path = os.path.join("/tmp", "results")
        if not os.path.exists(output_path):
            os.makedirs(output_path)
        
        try:
            # Download audio
            s3_client.download_file(bucket, key, local_wav)
            
            # 3. CALL ANALYZE WITH DIRECT FILE PATHS
            # This bypasses the search for a 'variables' folder
            args = Args(local_wav, output_path, cfg.MODEL_PATH, cfg.LABELS_FILE)
            analyze(args)
            
            # Find the generated CSV
            actual_output_files = glob.glob(f"{output_path}/*.csv")
            tags = {}
            
            if actual_output_files:
                with open(actual_output_files[0], 'r') as f:
                    lines = f.readlines()
                    for line in lines:
                        if "Common name" in line or not line.strip(): continue
                        parts = line.strip().split(',')
                        if len(parts) >= 5:
                            name, conf = parts[3], float(parts[4])
                            if conf >= args.min_conf:
                                tags[name] = tags.get(name, 0) + 1
            
            # Save to DynamoDB
            s3_url = f"https://{bucket}.s3.amazonaws.com/{key}"
            media_table.put_item(Item={'s3_url': s3_url, 'file_type': 'audio', 'tags': tags})
            processed_count += 1
            
            # Cleanup /tmp to prevent "No space left on device" errors
            if os.path.exists(local_wav): os.remove(local_wav)
            shutil.rmtree(output_path)

        except Exception as e:
            logger.error(f"Error {key}: {str(e)}")
            continue

    return {'statusCode': 200, 'body': json.dumps(f'Processed {processed_count} files.')}