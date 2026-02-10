import boto3
import uuid
import mimetypes
import os
import logging
import cgi
import io
import json
import base64
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')

ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp']
ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/flac']
ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv']
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

BUCKET_NAME = 'original-files-buck'
UPLOAD_PREFIX = 'media-files/'
THUMBNAIL_PREFIX = 'thumbnails/'

def lambda_handler(event, context):
    try:
        logger.info(f"Event received: {json.dumps(event, default=str)}")

        if event.get('httpMethod') == 'OPTIONS':
            return create_cors_response()

        if not event.get("body"):
            return create_error_response(400, "Request body is missing.")

        headers = event.get("headers", {})
        content_type = next((v for k, v in headers.items() if k.lower() == 'content-type'), None)
        if not content_type:
            return create_error_response(400, "Content-Type header is missing.")

        body = event["body"]
        if event.get("isBase64Encoded", False):
            try:
                body = base64.b64decode(body)
            except Exception as e:
                logger.error(f"Failed to decode base64 body: {str(e)}")
                return create_error_response(400, "Invalid base64 encoded body.")
        else:
            body = body.encode('utf-8') if isinstance(body, str) else body

        file_data = extract_file_data(body, content_type)
        validation_result = validate_file(file_data)
        if not validation_result['valid']:
            return create_error_response(400, validation_result['error'])

        upload_result = upload_to_s3(file_data)
        return create_success_response(upload_result)

    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}")
        return create_error_response(500, f"Internal error: {str(e)}")


def extract_file_data(body, content_type_header):
    try:
        environ = {'REQUEST_METHOD': 'POST', 'CONTENT_LENGTH': str(len(body))}
        headers = {'content-type': content_type_header}
        fs = cgi.FieldStorage(fp=io.BytesIO(body), headers=headers, environ=environ)

        if 'file' not in fs:
            raise ValueError("Missing 'file' field in form-data")

        file_item = fs['file']
        filename = file_item.filename
        content_type = file_item.type
        file_bytes = file_item.file.read()

        if not filename:
            raise ValueError("Missing filename")

        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            if not content_type:
                raise ValueError("Could not determine content type")

        logger.info(f"Extracted file: {filename}, type: {content_type}, size: {len(file_bytes)}")

        return {
            'filename': filename,
            'content': file_bytes,
            'content_type': content_type,
            'size': len(file_bytes)
        }

    except Exception as e:
        logger.error(f"Error extracting file data: {str(e)}")
        raise ValueError(f"Failed to extract file data: {str(e)}")


def validate_file(file_data):
    filename = file_data['filename']
    content_type = file_data['content_type']
    size = file_data['size']

    if size > MAX_FILE_SIZE:
        return {'valid': False, 'error': f"File size exceeds {MAX_FILE_SIZE} bytes"}
    if size == 0:
        return {'valid': False, 'error': "File is empty"}

    all_allowed_types = ALLOWED_IMAGE_TYPES + ALLOWED_AUDIO_TYPES + ALLOWED_VIDEO_TYPES
    if content_type not in all_allowed_types:
        return {'valid': False, 'error': f"Invalid file type: {content_type}"}

    if not filename or len(filename.strip()) == 0:
        return {'valid': False, 'error': "Invalid filename"}

    dangerous_extensions = ['.exe', '.bat', '.sh', '.cmd', '.scr', '.vbs', '.js']
    if any(filename.lower().endswith(ext) for ext in dangerous_extensions):
        return {'valid': False, 'error': "Disallowed file extension"}

    return {'valid': True}


def generate_unique_filename(original_filename, content_type):
    ext = mimetypes.guess_extension(content_type) or '.' + original_filename.split('.')[-1]
    base = ''.join(c for c in original_filename.split('.')[0] if c.isalnum() or c in '-_')[:50]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    uid = str(uuid.uuid4())
    return f"{base}_{timestamp}_{uid}{ext}"


def upload_to_s3(file_data):
    filename = file_data['filename']
    content = file_data['content']
    content_type = file_data['content_type']
    file_category = get_file_category(content_type)
    s3_filename = generate_unique_filename(filename, content_type)

    # Main object path
    file_key = f"{UPLOAD_PREFIX}{s3_filename}"

    # Upload main file
    s3_client.put_object(
        Bucket=BUCKET_NAME,
        Key=file_key,
        Body=content,
        ContentType=content_type,
        Metadata={
            'original-filename': filename,
            'upload-timestamp': datetime.now().isoformat(),
            'file-category': file_category
        }
    )

    s3_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{file_key}"

    return {
        'bucket': BUCKET_NAME,
        'key': file_key,
        'url': s3_url,
        'original_filename': filename,
        'content_type': content_type,
        'size': file_data['size'],
        'category': file_category
    }


def get_file_category(content_type):
    if content_type in ALLOWED_IMAGE_TYPES:
        return 'images'
    elif content_type in ALLOWED_AUDIO_TYPES:
        return 'audio'
    elif content_type in ALLOWED_VIDEO_TYPES:
        return 'video'
    else:
        return 'unknown'


def create_cors_response():
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': ''
    }

def create_success_response(upload_result):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps({
            'success': True,
            'message': 'File uploaded successfully',
            'data': upload_result
        })
    }

def create_error_response(status_code, error_message):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps({
            'success': False,
            'error': error_message
        })
    }