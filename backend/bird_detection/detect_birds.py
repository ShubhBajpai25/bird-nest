#!/usr/bin/env python
# coding: utf-8

import argparse
import json
import os
from ultralytics import YOLO
import supervision as sv
import cv2 as cv
import numpy as np
import sys

def get_file_type(file_path):
    """
    Determine file type based on extension
    """
    _, ext = os.path.splitext(file_path.lower())
    
    # Image extensions
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.gif'}
    
    # Video extensions
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpg', '.mpeg'}
    
    if ext in image_extensions:
        return 'image'
    elif ext in video_extensions:
        return 'video'
    else:
        return 'unknown'

def find_media_file_in_directory(directory_path):
    """
    Find the first supported media file in a directory
    """
    if not os.path.isdir(directory_path):
        return None
    
    # Supported extensions
    supported_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.gif',
                          '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpg', '.mpeg'}
    
    for filename in os.listdir(directory_path):
        _, ext = os.path.splitext(filename.lower())
        if ext in supported_extensions:
            return os.path.join(directory_path, filename)
    
    return None

def detect_birds_in_file(input_path, output_dir, confidence=0.5, model_path="./model.pt"):
    """
    Detect birds in a file and return results
    """
    try:
        # Handle directory input - find first supported file
        actual_file_path = input_path
        
        if os.path.isdir(input_path):
            print(f"Input is a directory: {input_path}")
            found_file = find_media_file_in_directory(input_path)
            if found_file:
                actual_file_path = found_file
                print(f"Found media file: {actual_file_path}")
            else:
                raise ValueError(f"No supported media files found in directory: {input_path}")
        
        # Auto-detect file type
        file_type = get_file_type(actual_file_path)
        print(f"Auto-detected file type: {file_type}")
        
        if file_type == 'unknown':
            raise ValueError(f"Unsupported file type for: {actual_file_path}. Supported types: images and videos.")
        
        print(f"Loading model from: {model_path}")
        model = YOLO(model_path)
        class_dict = model.names
        print(f"Model loaded successfully. Classes: {list(class_dict.values())}")
        
        detection_results = {'birds': {}, 'total_count': 0, 'file_type': file_type, 'processed_file': actual_file_path}
        
        if file_type == 'image':
            detection_results.update(detect_birds_in_image(actual_file_path, model, class_dict, confidence))
        elif file_type == 'video':
            detection_results.update(detect_birds_in_video(actual_file_path, model, class_dict, confidence))
        
        # Save results to JSON file
        os.makedirs(output_dir, exist_ok=True)
        results_file = os.path.join(output_dir, 'detection_results.json')
        with open(results_file, 'w') as f:
            json.dump(detection_results, f, indent=2)
        
        print(f"Detection results saved to: {results_file}")
        print(f"Results: {detection_results}")
        
        return detection_results
        
    except Exception as e:
        print(f"Error in detect_birds_in_file: {str(e)}")
        # Save error results
        error_results = {'birds': {}, 'total_count': 0, 'error': str(e), 'file_type': file_type if 'file_type' in locals() else 'unknown'}
        os.makedirs(output_dir, exist_ok=True)
        results_file = os.path.join(output_dir, 'detection_results.json')
        with open(results_file, 'w') as f:
            json.dump(error_results, f, indent=2)
        raise

def detect_birds_in_image(image_path, model, class_dict, confidence):
    """
    Detect birds in an image
    """
    try:
        print(f"Processing image: {image_path}")
        img = cv.imread(image_path)
        
        if img is None:
            print(f"Error: Could not load image from {image_path}")
            return {'birds': {}, 'total_count': 0}
        
        print(f"Image loaded successfully. Shape: {img.shape}")
        
        # Run the model on the image
        results = model(img)
        result = results[0]
        
        # Convert YOLO result to Detections format
        detections = sv.Detections.from_ultralytics(result)
        
        bird_counts = {}
        
        if detections.class_id is not None and len(detections.class_id) > 0:
            print(f"Found {len(detections.class_id)} detections before confidence filtering")
            
            # Filter detections based on confidence threshold
            high_conf_mask = detections.confidence > confidence
            filtered_detections = detections[high_conf_mask]
            
            print(f"Found {len(filtered_detections.class_id) if filtered_detections.class_id is not None else 0} detections after confidence filtering (>{confidence})")
            
            if filtered_detections.class_id is not None:
                for cls_id, conf in zip(filtered_detections.class_id, filtered_detections.confidence):
                    bird_name = class_dict[cls_id]
                    bird_counts[bird_name] = bird_counts.get(bird_name, 0) + 1
                    print(f"Detected: {bird_name} with confidence {conf:.2f}")
        else:
            print("No detections found")
        
        result_dict = {
            'birds': bird_counts,
            'total_count': sum(bird_counts.values())
        }
        
        print(f"Final detection counts: {bird_counts}")
        return result_dict
        
    except Exception as e:
        print(f"Error in detect_birds_in_image: {str(e)}")
        return {'birds': {}, 'total_count': 0}

def detect_birds_in_video(video_path, model, class_dict, confidence):
    """
    Detect birds in a video (processes sample frames for efficiency)
    """
    try:
        print(f"Processing video: {video_path}")
        cap = cv.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"Error: Could not open video {video_path}")
            return {'birds': {}, 'total_count': 0}
        
        # Get video properties
        total_frames = int(cap.get(cv.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv.CAP_PROP_FPS)
        duration = total_frames / fps if fps > 0 else 0
        
        print(f"Video properties - Total frames: {total_frames}, FPS: {fps}, Duration: {duration:.2f}s")
        
        bird_counts = {}
        frame_count = 0
        processed_frames = 0
        max_frames_to_process = min(100, total_frames)  # Process max 100 frames
        frame_interval = max(1, total_frames // max_frames_to_process)  # Calculate interval
        
        print(f"Will process every {frame_interval}th frame, up to {max_frames_to_process} frames")
        
        while cap.isOpened() and processed_frames < max_frames_to_process:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process frames at intervals
            if frame_count % frame_interval == 0:
                try:
                    # Run detection on this frame
                    results = model(frame)
                    result = results[0]
                    detections = sv.Detections.from_ultralytics(result)
                    
                    if detections.class_id is not None and len(detections.class_id) > 0:
                        # Filter by confidence
                        high_conf_mask = detections.confidence > confidence
                        filtered_detections = detections[high_conf_mask]
                        
                        if filtered_detections.class_id is not None:
                            for cls_id in filtered_detections.class_id:
                                bird_name = class_dict[cls_id]
                                bird_counts[bird_name] = bird_counts.get(bird_name, 0) + 1
                    
                    processed_frames += 1
                    if processed_frames % 10 == 0:
                        print(f"Processed {processed_frames} frames...")
                        
                except Exception as frame_error:
                    print(f"Error processing frame {frame_count}: {str(frame_error)}")
            
            frame_count += 1
        
        cap.release()
        
        result_dict = {
            'birds': bird_counts,
            'total_count': sum(bird_counts.values())
        }
        
        print(f"Video processing complete. Processed {processed_frames} frames.")
        print(f"Final detection counts: {bird_counts}")
        
        return result_dict
        
    except Exception as e:
        print(f"Error in detect_birds_in_video: {str(e)}")
        return {'birds': {}, 'total_count': 0}

def main():
    parser = argparse.ArgumentParser(description='Detect birds in media files (auto-detects file type)')
    parser.add_argument('--input', required=True, help='Input file path')
    parser.add_argument('--output', required=True, help='Output directory')
    parser.add_argument('--confidence', type=float, default=0.5, help='Confidence threshold (default: 0.5)')
    parser.add_argument('--model', default='./model.pt', help='Path to YOLO model file (default: ./model.pt)')
    
    args = parser.parse_args()
    
    print(f"Starting bird detection with arguments:")
    print(f"  Input: {args.input}")
    print(f"  Output: {args.output}")
    print(f"  Confidence: {args.confidence}")
    print(f"  Model: {args.model}")
    
    # Check if input file or directory exists
    if not os.path.exists(args.input):
        print(f"Error: Input path does not exist: {args.input}")
        sys.exit(1)
    
    # Check if model file exists
    if not os.path.exists(args.model):
        print(f"Error: Model file does not exist: {args.model}")
        sys.exit(1)
    
    try:
        results = detect_birds_in_file(
            args.input, 
            args.output, 
            args.confidence,
            args.model
        )
        print("Bird detection completed successfully!")
        return 0
        
    except Exception as e:
        print(f"Bird detection failed: {str(e)}")
        return 1

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)