const axios = require('axios');

class InvidiousAPI {
    constructor() {
        this.instance = "https://vid.puffyan.us";  // Keep only the first instance
        this.pageSize = 20;
        this.loadedVideoIds = new Set(); // To track already-loaded video IDs
        this.maxRetries = 2; // Number of retries allowed
    }

    // Generic method to fetch videos and filter duplicates
    async fetchVideos(endpoint, params = {}) {
        let retries = 0;
        
        while (retries <= this.maxRetries) {
            try {
                const response = await axios.get(`${this.instance}${endpoint}`, { params });
                const videos = response.data.map(video => ({
                    id: video.videoId,
                    title: video.title,
                    thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
                    channelTitle: video.author,
                    viewCount: video.viewCount || 0,
                    duration: video.lengthSeconds || 0
                }));

                // Filter out duplicates
                const uniqueVideos = videos.filter(video => !this.loadedVideoIds.has(video.id));

                // Update the set with new video IDs
                uniqueVideos.forEach(video => this.loadedVideoIds.add(video.id));

                return uniqueVideos;
            } catch (error) {
                console.error(`Fetch error (attempt ${retries + 1}):`, error);
                
                if (retries < this.maxRetries) {
                    retries++;
                    // Wait for a short period before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                
                return [];
            }
        }
        
        return []; // Return empty array if all retries fail
    }

    // Method to search for videos
    async searchVideos(query, page = 1) {
        return this.fetchVideos('/api/v1/search', {
            q: query,
            type: 'video',
            page: page
        });
    }

    // Method to get trending videos
    async getTrending(page = 1) {
        return this.fetchVideos('/api/v1/trending', { page: page });
    }
}

module.exports = InvidiousAPI;