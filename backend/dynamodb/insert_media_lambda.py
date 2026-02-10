import json
import boto3

dynamodb = boto3.resource('dynamodb')
media_table = dynamodb.Table('MediaFiles')
species_table = dynamodb.Table('SpeciesMedia')
thumbnail_table = dynamodb.Table('ThumbnailToMedia')

"""
Example event:
{
  "s3_url": "https://your-bucket.s3.amazonaws.com/media/file123.jpg",
  "thumbnail_s3_url": "https://your-bucket.s3.amazonaws.com/media/thumbs/file123-thumb.jpg",
  "file_type": "image",
  "tags": {
    "crow": 2,
    "pigeon": 1
  }
}
"""
def lambda_handler(event, context):
    try:
        if 's3_url' not in event:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 's3_url is required'})
            }

        s3_url = event['s3_url']
        update_species = False
        new_tags = event.get('tags', {})
        new_species_set = set(new_tags.keys())

        # Fetch current MediaFile item (if it exists)
        existing_item = media_table.get_item(Key={'s3_url': s3_url}).get('Item')
        old_species_set = set(existing_item.get('tags', {}).keys()) if existing_item else set()

        # Build new media item
        media_item = {
            's3_url': s3_url
        }

        if 'thumbnail_s3_url' in event:
            media_item['thumbnail_s3_url'] = event['thumbnail_s3_url']
        if 'file_type' in event:
            media_item['file_type'] = event['file_type']
        if new_tags:
            media_item['tags'] = new_tags
            media_item['detected_species_list'] = list(new_species_set)
            update_species = True

        # Upsert into MediaFiles
        media_table.put_item(Item=media_item)

        if update_species:
            # Delete old species entries that are no longer present
            species_to_delete = old_species_set - new_species_set
            for species in species_to_delete:
                species_table.delete_item(
                    Key={
                        'has_species': f"species#{species}",
                        's3_url': s3_url
                    }
                )

            # Upsert new or updated species entries
            for species, count in new_tags.items():
                species_entry = {
                    'has_species': f"species#{species}",
                    's3_url': s3_url,
                    'species_count': count,
                    'thumbnail_s3_url': media_item.get('thumbnail_s3_url'),
                    'file_type': media_item.get('file_type')
                }
                species_table.put_item(Item=species_entry)

        # Add or update reverse lookup if thumbnail provided
        if 'thumbnail_s3_url' in event:
            thumbnail_table.put_item(Item={
                'thumbnail_s3_url': event['thumbnail_s3_url'],
                's3_url': s3_url
            })

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Media file inserted/updated successfully',
                's3_url': s3_url,
                'species_updated': list(new_species_set)
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }