# python/worker.py
import os
import sys
import yt_dlp
import subprocess
import json
from datetime import datetime

class VideoProcessor:
    def __init__(self):
        self.application_path = self._get_application_path()
        self.temp_dir = os.path.join(self.application_path, 'temp')
        self.ffmpeg_path = os.path.join(self.application_path, 'ffmpeg.exe')
        os.makedirs(self.temp_dir, exist_ok=True)

    def _get_application_path(self):
        if getattr(sys, 'frozen', False):
            return sys._MEIPASS
        return os.path.dirname(os.path.abspath(__file__))

    def process_video(self, url, start_time, end_time, quality, output_dir, is_audio_only=False):
        try:
            # Ensure output directory exists
            output_dir = os.path.abspath(output_dir)
            os.makedirs(output_dir, exist_ok=True)
            
            format_string = 'bestaudio/best' if is_audio_only else self._get_format_string(quality)
            ext = '.mp3' if is_audio_only else '.mp4'
            ydl_opts = {
                'format': format_string,
                'outtmpl': os.path.join(self.temp_dir, '%(title)s.%(ext)s'),
                'ffmpeg_location': self.ffmpeg_path,
                'progress_hooks': [self._progress_hook],
            }
            if is_audio_only:
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                downloaded_path = ydl.prepare_filename(info)
                if is_audio_only:
                    downloaded_path = os.path.splitext(downloaded_path)[0] + '.mp3'

            output_filename = f"trimmed_{datetime.now().strftime('%Y%m%d%H%M%S')}{ext}"
            output_path = os.path.join(output_dir, output_filename)
            print(f"Resolved output path: {output_path}")

            if is_audio_only:
                self._trim_audio(downloaded_path, output_path, start_time, end_time)
            else:
                self._trim_video(downloaded_path, output_path, start_time, end_time)

            self._cleanup()
            return {'success': True, 'path': output_path}

        except Exception as e:
            return {'success': False, 'error': str(e)}


    def _progress_hook(self, d):
        if d['status'] == 'downloading':
            downloaded = d.get('downloaded_bytes', 0)
            total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            if total > 0:
                progress = (downloaded / total) * 100
                print(json.dumps({'progress': progress}))
        elif d['status'] == 'finished':
            print(json.dumps({'progress': 100}))

    def _get_format_string(self, quality):
        quality_options = {
            '360p': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]',
            '480p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]',
            '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]',
            '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]',
            'highest': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]'
        }
        return quality_options.get(quality, quality_options['highest'])
    
    def _trim_audio(self, input_file_path, output_file_path, start_time, end_time):
        """Trim audio file using FFmpeg"""
        command = [
            self.ffmpeg_path,
            '-ss', str(start_time),
            '-i', input_file_path,
            '-to', str(end_time),
            '-c:a', 'libmp3lame',
            '-q:a', '2',
            '-copyts',
            '-avoid_negative_ts', 'make_zero',
            output_file_path
        ]
        
        try:
            creation_flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            subprocess.run(command, creationflags=creation_flags, check=True, 
                          stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error: {e.stderr.decode()}")
            raise

    def _trim_video(self, input_file_path, output_file_path, start_time, end_time):
        """Trim video file using FFmpeg"""
        command = [
            self.ffmpeg_path,
            '-ss', str(start_time),
            '-i', input_file_path,
            '-to', str(end_time),
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '20',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            '-copyts',
            '-avoid_negative_ts', 'make_zero',
            output_file_path
        ]
        
        try:
            creation_flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            subprocess.run(command, creationflags=creation_flags, check=True, 
                          stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error: {e.stderr.decode()}")
            raise

    def _cleanup(self):
        """Cleans up temporary files."""
        try:
            for file in os.listdir(self.temp_dir):
                file_path = os.path.join(self.temp_dir, file)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            print("Temporary files cleaned up.")
        except Exception as e:
            print(f"Error during cleanup: {e}")

    
