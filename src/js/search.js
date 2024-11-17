const invidiousAPI = require('./api.js');

// Format video duration
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Format view count
function formatViews(views) {
    if (views >= 1000000) {
        return `${(views / 1000000).toFixed(1)}M views`;
    }
    if (views >= 1000) {
        return `${(views / 1000).toFixed(1)}K views`;
    }
    return `${views} views`;
}

// Format published date
function formatPublished(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 1) return 'Today';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
}

// Create video card HTML
function createVideoCard(video) {
    return `
        <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
            <div class="relative">
                <img src="${video.thumbnailUrl}" alt="${video.title}" 
                     class="w-full h-48 object-cover">
                <span class="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-sm">
                    ${formatDuration(video.lengthSeconds)}
                </span>
            </div>
            <div class="p-4">
                <h3 class="font-semibold text-lg mb-2 line-clamp-2">${video.title}</h3>
                <p class="text-gray-600 text-sm mb-2">${video.author}</p>
                <div class="flex items-center text-sm text-gray-500">
                    <span>${formatViews(video.viewCount)}</span>
                    <span class="mx-2">•</span>
                    <span>${formatPublished(video.published)}</span>
                </div>
            </div>
        </div>
    `;
}

// Show loading state
function showLoading() {
    const container = document.getElementById('videos-container');
    container.innerHTML = `
        <div class="col-span-full flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    `;
}

// Show error message
function showError(message) {
    const container = document.getElementById('videos-container');
    container.innerHTML = `
        <div class="col-span-full text-center py-12">
            <p class="text-red-500">${message}</p>
        </div>
    `;
}

// Load trending videos
async function loadTrendingVideos() {
    try {
        showLoading();
        const videos = await invidiousAPI.fetchDefaultVideos();
        const container = document.getElementById('videos-container');
        if (videos.length === 0) {
            showError('No videos found');
            return;
        }
        container.innerHTML = videos.map(video => createVideoCard(video)).join('');
    } catch (error) {
        showError('Error loading trending videos');
        console.error(error);
    }
}

// Handle search
async function handleSearch(event) {
    event.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;

    try {
        showLoading();
        const videos = await invidiousAPI.getVideos(query);
        const container = document.getElementById('videos-container');
        if (videos.length === 0) {
            showError('No videos found');
            return;
        }
        container.innerHTML = videos.map(video => createVideoCard(video)).join('');
    } catch (error) {
        showError('Error searching videos');
        console.error(error);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadTrendingVideos();
    const searchForm = document.getElementById('search-form');
    searchForm.addEventListener('submit', handleSearch);
});