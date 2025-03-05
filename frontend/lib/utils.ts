import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  seconds = Math.floor(seconds);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  let timeString = '';
  
  if (hours > 0) {
    timeString += `${hours}:`;
    timeString += `${minutes.toString().padStart(2, '0')}:`;
  } else {
    timeString += `${minutes}:`;
  }
  
  timeString += remainingSeconds.toString().padStart(2, '0');
  return timeString;
}

// Format view count with K, M, B suffixes
export function formatViews(views) {
  if (!views) return '0 views';
  
  if (views >= 1000000000) {
    return `${(views / 1000000000).toFixed(1)}B views`;
  }
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
}

// Format published date with improved relative time handling
export function formatPublished(timestamp) {
  if (!timestamp) return 'Unknown date';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) !== 1 ? 's' : ''} ago`;
}
