import os
import json
import boto3
import shutil
import subprocess
import numpy as np
import scipy.io.wavfile
from urllib.parse import unquote_plus
import logging

# Direct TFLite import
import tensorflow.lite as tflite

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
media_table = dynamodb.Table(os.environ.get('TABLE_NAME', 'MediaFiles'))
s3_client = boto3.client('s3')

# --- CONFIG ---
SIG_LENGTH = 3.0
SIG_OVERLAP = 0.0
SAMPLE_RATE = 48000
CONFIDENCE_THRESHOLD = 0.4

def load_labels(labels_file):
    labels = []
    with open(labels_file, 'r') as f:
        for line in f.readlines():
            labels.append(line.strip())
    return labels

def load_audio_ffmpeg(input_path, target_sr=48000):
    """
    Uses the system FFmpeg to decode and resample audio to 48kHz Mono.
    This bypasses Librosa/Numba segfaults.
    """
    output_wav = "/tmp/temp_audio.wav"
    
    # Command: ffmpeg -y -i input -ar 48000 -ac 1 -c:a pcm_s16le output.wav
    cmd = [
        '/usr/bin/ffmpeg', 
        '-y',                 # Overwrite output
        '-v', 'error',        # Suppress logs
        '-i', input_path,     # Input file
        '-ar', str(target_sr),# Resample to 48k
        '-ac', '1',           # Mix to Mono
        '-f', 'wav',          # Force WAV format
        '-c:a', 'pcm_s16le',  # Force standard 16-bit PCM (for Scipy compatibility)
        output_wav
    ]
    
    # Run FFmpeg process
    subprocess.check_call(cmd)
    
    # Read the clean WAV file using standard SciPy
    sr, data = scipy.io.wavfile.read(output_wav)
    
    # Convert int16 to float32 between -1.0 and 1.0 (BirdNET expects this)
    if data.dtype == np.int16:
        data = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        data = data.astype(np.float32) / 2147483648.0
    elif data.dtype == np.uint8:
        data = (data.astype(np.float32) - 128.0) / 128.0
        
    return data

def predict(interpreter, samples):
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    # Calculate chunk sizes
    chunk_size = int(SIG_LENGTH * SAMPLE_RATE)
    step_size = int((SIG_LENGTH - SIG_OVERLAP) * SAMPLE_RATE)
    
    output_data = []
    
    # Sliding window inference
    for i in range(0, len(samples) - chunk_size + 1, step_size):
        chunk = samples[i:i + chunk_size]
        
        # Prepare tensor
        input_tensor = chunk.reshape(1, chunk_size).astype(np.float32)
        interpreter.set_tensor(input_details[0]['index'], input_tensor)
        
        interpreter.invoke()
        output_data.append(interpreter.get_tensor(output_details[0]['index'])[0])

    return np.array(output_data)

def lambda_handler(event, context):
    # Setup Paths
    MODEL_PATH = os.environ.get('MODEL_PATH', '/var/task/model/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite')
    LABELS_FILE = os.environ.get('LABELS_FILE', '/var/task/model/BirdNET_GLOBAL_6K_V2.4_Labels.txt')

    processed_count = 0

    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])
        logger.info(f"Processing: {key}")

        local_input = os.path.join("/tmp", os.path.basename(key))
        
        try:
            # 1. Download
            s3_client.download_file(bucket, key, local_input)
            
            # 2. Decode Audio (The Crash-Proof Way)
            # This calls FFmpeg directly, avoiding the Python Segfault
            sig = load_audio_ffmpeg(local_input)
            
            # 3. Load Model
            interpreter = tflite.Interpreter(model_path=MODEL_PATH, num_threads=1)
            interpreter.allocate_tensors()
            labels = load_labels(LABELS_FILE)
            
            # 4. Run Inference
            raw_predictions = predict(interpreter, sig)
            
            # 5. Aggregate Results
            tags = {}
            if len(raw_predictions) > 0:
                for pred_chunk in raw_predictions:
                    # Get top confident predictions
                    indices = np.argwhere(pred_chunk >= CONFIDENCE_THRESHOLD).flatten()
                    for idx in indices:
                        if idx < len(labels):
                            # Label format is usually "ID_Scientific_Common"
                            parts = labels[idx].split('_')
                            common_name = parts[-1] if len(parts) > 1 else labels[idx]
                            tags[common_name] = tags.get(common_name, 0) + 1

            logger.info(f"Detected tags: {tags}")

            # 6. Save to DynamoDB
            s3_url = f"https://{bucket}.s3.amazonaws.com/{key}"
            media_table.put_item(Item={
                's3_url': s3_url,
                'file_type': 'audio',
                'tags': tags
            })
            processed_count += 1
            
            # Cleanup
            if os.path.exists(local_input): os.remove(local_input)
            if os.path.exists("/tmp/temp_audio.wav"): os.remove("/tmp/temp_audio.wav")

        except Exception as e:
            logger.error(f"Error {key}: {str(e)}")
            continue

    return {'statusCode': 200, 'body': json.dumps(f'Processed {processed_count} files.')}