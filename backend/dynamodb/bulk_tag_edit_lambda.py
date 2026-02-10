import json
import boto3

dynamodb = boto3.resource('dynamodb')
media_table = dynamodb.Table('MediaFiles')
species_table = dynamodb.Table('SpeciesMedia')
thumbnail_table = dynamodb.Table('ThumbnailToMedia')

"""
Example event:
{
  "urls": [
    "https://.../image1-thumb.png",
    "https://.../image2-thumb.png"
  ],
  "operation": 1,
  "tags":
    ["crow, 1", 
    "pigeon, 2"]
}
"""
def lambda_handler(event, context):
    # CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps('OK')
        }
    # Parse body
    event = json.loads(event.get("body", "{}"))
    urls = event.get('urls', [])
    operation = event.get('operation')
    tag_pairs = event.get('tags', [])

    if not urls or operation not in (0, 1) or not tag_pairs:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Invalid request'})}

    parsed_tags = {k: int(v) for k, v in (tag.split(',') for tag in tag_pairs)}

    for url in urls:
        # Lookup full s3_url if it's a thumbnail URL
        s3_url = url
        if 'thumb' in url:
            resp = thumbnail_table.get_item(Key={'thumbnail_s3_url': url})
            if 'Item' not in resp or 's3_url' not in resp['Item']:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST'
                    },
                    'body': json.dumps({'error': f'Thumbnail URL {url} not found in mapping table'})
                }
            s3_url = resp['Item']['s3_url']


        # Get existing item
        item = media_table.get_item(Key={'s3_url': s3_url}).get('Item', {})
        current_tags = item.get('tags', {})

        if operation == 1:
            for k, v in parsed_tags.items():
                current_tags[k] = current_tags.get(k, 0) + v
        else:
            for k, v in parsed_tags.items():
                if k in current_tags:
                    current_tags[k] = max(0, current_tags[k] - v)
                    if current_tags[k] == 0:
                        del current_tags[k]

        # Update MediaFiles table
        media_table.update_item(
            Key={'s3_url': s3_url},
            UpdateExpression="SET tags = :t",
            ExpressionAttributeValues={':t': current_tags}
        )

        # Sync SpeciesMedia table (delete and re-add for simplicity)
        for k in parsed_tags:
            species_table.delete_item(Key={'has_species': f"species#{k}", 's3_url': s3_url})
            if k in current_tags:
                species_table.put_item(Item={
                    'has_species': f"species#{k}",
                    's3_url': s3_url,
                    'species_count': current_tags[k],
                    'file_type': item.get('file_type'),
                    'thumbnail_s3_url': item.get('thumbnail_s3_url')
                })

    return {'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({'message': 'Tags updated'})}