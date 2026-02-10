import json
import boto3

dynamodb = boto3.resource('dynamodb')
media_table = dynamodb.Table('MediaFiles')
species_table = dynamodb.Table('SpeciesMedia')
thumbnail_table = dynamodb.Table('ThumbnailToMedia')

"""
Example event:
{
  "tags": {
    "crow": 1,
    "pigeon": 2
  }
}
"""
def lambda_handler(event, context):
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
    print("I'm here")
    event = json.loads(event["body"])
    tags = event.get("tags", {})
    if not tags:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Tags required'})}

    result_sets = []
    
    for species, min_count in tags.items():
        response = species_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('has_species').eq(f"species#{species}")
        )
        matching_items = [
            item for item in response.get('Items', [])
            if item['species_count'] >= min_count
        ]
        urls = [item['thumbnail_s3_url'] if item['file_type'] == 'image' else item['s3_url'] for item in matching_items]
        result_sets.append(set(urls))

    # Intersect all sets (AND logic)
    matching_urls = list(set.intersection(*result_sets)) if result_sets else []


    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },

        'body': json.dumps({'links': matching_urls})
    }