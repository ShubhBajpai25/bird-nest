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
    "https://.../image1.png",
    "https://.../image1-thumb.png"
  ]
}
"""
def lambda_handler(event, context):
    urls = event.get("urls", [])
    if not urls:
        return {'statusCode': 400, 'body': json.dumps({'error': 'URLs required'})}

    deleted = []

    for url in urls:
        # Derive bucket and key
        parts = url.split('/')
        bucket = parts[2].split('.')[0]
        key = '/'.join(parts[3:])

        try:
            s3.delete_object(Bucket=bucket, Key=key)
            deleted.append(url)

            # Clean from tables
            if 'thumb' in url:
                thumbnail_table.delete_item(Key={"thumbnail_s3_url": url})
            else:
                media_table.delete_item(Key={"s3_url": url})
                # Remove all species entries with this s3_url
                scan = species_table.scan(FilterExpression=boto3.dynamodb.conditions.Attr('s3_url').eq(url))
                for item in scan['Items']:
                    species_table.delete_item(Key={'has_species': item['has_species'], 's3_url': url})

        except Exception as e:
            continue  # Log if needed

    return {
        'statusCode': 200,
        'body': json.dumps({'deleted': deleted})
    }