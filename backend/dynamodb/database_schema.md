Table: MediaFiles

This table stores information about each uploaded media file and its associated bird species data.

    Table Name: MediaFiles

    Primary Key:

        Partition Key (PK): s3_url: (Type: String) - Full S3 URL of the original media file.

    Attributes:

        s3_url: (Type: String) - Full S3 URL of the original media file.

        thumbnail_s3_url: (Type: String, Optional) - S3 URL of the image thumbnail. Only present for image files.

        file_type: (Type: String) - Values: "image", "audio", "video".

        tags: (Type: Map) - Stores detected bird species and their counts.
        Example: {"crow": 3, "pigeon": 1}

Table: SpeciesMedia

This table supports species-based queries, especially filtering or sorting by count.

Each file with multiple species will create multiple entries, one per species.

    Table Name: SpeciesMedia

    Primary Key:

        Partition Key (PK): has_species (Type: String) - Format: "species#<species_name>"
        Example: "species#crow"

        Sort Key (SK): s3_url: (Type: String) - Optional, if needed for immediate preview.

    Attributes:

        species_count (Type: Number) - The number of times this species appears in the file.

        s3_url: (Type: String) - Optional, if needed for immediate preview.

Table: ThumbnailToMedia

Allows reverse lookup from thumbnail → original media file.

    Table Name: ThumbnailToMedia

    Primary Key:

        Partition Key (PK): thumbnail_s3_url: (Type: String, Optional) - S3 URL of thumbnail, if applicable.

    Attributes:

        s3_url: (Type: String) - Optional, if needed for immediate preview.