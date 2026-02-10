import csv
import json
import boto3
import os
import tempfile
import zipfile
from urllib.parse import unquote_plus
import logging

from birdnet_analyzer.analyze.core import analyze
from birdnet_analyzer import config as cfg

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Set local file paths for model and output
MODEL_DIR = '/tmp/model'
OUTPUT_DIR = '/tmp/output'

s3_client = boto3.client('s3')

def extract_csv_data(file_path):
    """
    Extracts data from a CSV file and returns the species name and their respective counts.
    
    :param file_path: Path to the CSV file.
    :return: List of dictionaries containing the CSV data.
    """
    with open(file_path, mode='r', newline='', encoding='utf-8') as csvfile:
        data: dict[str, int] = {}

        for row in csv.DictReader(csvfile):
            name = row["Common name"]
            data[name] = data.get(name, 0) + 1

        return data
    
def download_model(bucket_name: str):
    model_prefix: str = os.environ.get('MODEL_PATH', "models/audio_model/")
    zip_key: str = os.path.join(model_prefix, 'BirdNET-Analyzer-V2.4.zip')
    
    # Ensure the model directory exists
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Create a temporary file path for the zip file
    temp_zip_path = os.path.join(tempfile.gettempdir(), 'BirdNET-Analyzer-V2.4.zip')

    # Download the zip file from S3
    s3_client.download_file(bucket_name, zip_key, temp_zip_path)

    # Extract the zip file
    with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
        zip_ref.extractall(MODEL_DIR)

    # Clean up the temporary zip file
    os.remove(temp_zip_path)

def lambda_handler(event, context):
    cfg.MODEL_PATH = os.environ["MODEL_PATH"]
    cfg.MDATA_MODEL_PATH = os.environ["MDATA_MODEL_PATH"]
    cfg.LABELS_FILE = os.environ["LABELS_FILE"]

    out = []

    for record in event['Records']:
        # Extract bucket and key from the S3 event record
        bucket: str = record['s3']['bucket']['name']
        key: str = unquote_plus(record['s3']['object']['key'])

        logger.info(f"New file: s3://{bucket}/{key}")

        try:
            # download the file from S3
            local_wav = os.path.join("/tmp", os.path.basename(key))
            s3_client.download_file(bucket, key, local_wav)
            
            logger.info(f"File downloaded successfully: {local_wav}")

            # download the model from S3
            download_model(bucket)

            # test if the model is downloaded
            if not os.path.exists(MODEL_DIR):
                raise FileNotFoundError(f"Model directory {MODEL_DIR} does not exist after download.")
            
            logger.info(f"Model directory exists: {MODEL_DIR}")

            analyze(
                audio_input=local_wav,
                output=OUTPUT_DIR,
                rtype="csv",
                combine_results=True,
            )

            logger.info(f"Analysis completed for file: {local_wav}")

            # Extract and print the data from the generated CSV file
            csv_file_path = os.path.join(OUTPUT_DIR, "BirdNET_CombinedTable.csv")
            if os.path.exists(csv_file_path):
                csv_data = extract_csv_data(csv_file_path)
                out.append({
                    "input_s3": f"s3://{bucket}/{key}",
                    "tags": csv_data,
                })

                logger.info(f"CSV data extracted: {csv_data}")
            else:
                logger.warning(f"CSV file not found: {csv_file_path}")

        except Exception as e:
            print(f"Error downloading file: {e}")


    return {
        'statusCode': 200,
        'body': json.dumps('File download process initiated successfully!')
    }