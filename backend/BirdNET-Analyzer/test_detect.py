import csv
import os

from birdnet_analyzer.analyze.core import analyze
import birdnet_analyzer.config as cfg

def extract_csv_data(file_path):
    """
    Extracts data from a CSV file and returns the species name and their respective counts.
    
    :param file_path: Path to the CSV file.
    :return: List of dictionaries containing the CSV data.
    """
    with open(file_path, mode='r', newline='', encoding='utf-8') as csvfile:
        data: dict[str, int] = {}

        for row in csv.DictReader(f):
            name = row["Common name"]
            data[name] = data.get(name, 0) + 1

        return data


def main():
    # Define the path to the audio file (using container path)
    audio_path = "./test/test.wav"

    # Ensure the output directory exists
    cfg.MODEL_PATH = os.path.join(cfg.SCRIPT_DIR, "model/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite")
    cfg.MDATA_MODEL_PATH = os.path.join(cfg.SCRIPT_DIR, "model/BirdNET_GLOBAL_6K_V2.4_MData_Model_V2_FP16.tflite")
    cfg.LABELS_FILE = os.path.join(cfg.SCRIPT_DIR, "model/BirdNET_GLOBAL_6K_V2.4_Labels.txt")

    # Call the analyze function with the audio file
    analyze(
        audio_input=audio_path,
        output="test",
        rtype="csv",
        combine_results=True,
    )

    # Extract and print the data from the generated CSV file
    csv_data = extract_csv_data("./test/BirdNET_CombinedTable.csv")
    print(csv_data)


if __name__ == "__main__":
    main()