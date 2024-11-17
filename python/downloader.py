# python/downloader.py
import sys
import json
from worker import VideoProcessor

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.argv[1])
        
        processor = VideoProcessor()
        result = processor.process_video(
            url=f"https://www.youtube.com/watch?v={input_data['videoId']}",
            start_time=input_data['startTime'],
            end_time=input_data['endTime'],
            quality=input_data['quality'],
            output_dir=input_data['outputPath'],
            is_audio_only=input_data['format'] == 'audio'
        )
        
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))

if __name__ == "__main__":
    main()
