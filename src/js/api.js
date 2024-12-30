const axios = require('axios');

class PipedAPI {
    constructor(options = {}) {
        // Piped instances can be found at https://piped-instances.kavin.rocks/
        this.instances = [
            "https://pipedapi.kavin.rocks"
        ];
        this.currentInstance = this.instances[0];
        this.pageSize = 20;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.timeout = 5000;
    }

    async executeWithRetry(operation) {
        let lastError;
        
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt + 1}/${this.maxRetries} failed:`, error.message);

                if (attempt < this.maxRetries - 1) {
                    // Try switching to next instance if available
                    if (this.instances.length > 1) {
                        this.currentInstance = this.instances[
                            (this.instances.indexOf(this.currentInstance) + 1) % this.instances.length
                        ];
                        console.log(`Switching to instance: ${this.currentInstance}`);
                    }

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }

        console.error(`All ${this.maxRetries} attempts failed. Last error:`, lastError);
        return [];
    }

    async searchVideos(query, page = 1) {
        return this.executeWithRetry(async () => {
            const response = await axios.get(`${this.currentInstance}/search`, {
                params: {
                    q: query,
                    filter: "videos",
                    page: page
                },
                timeout: this.timeout
            });

            return this.formatVideoResults(response.data.items);
        });
    }

    async getTrending(page = 1) {
        return this.executeWithRetry(async () => {
            // Using US as the default region since it's most commonly available
            const response = await axios.get(`${this.currentInstance}/trending`, {
                params: {
                    region: 'US'  // Hardcoded to US region for reliability
                },
                timeout: this.timeout
            });

            // Check if we received an array of videos
            if (!Array.isArray(response.data)) {
                throw new Error('Invalid response format from trending endpoint');
            }

            return this.formatVideoResults(response.data);
        });
    }

    formatVideoResults(videos) {
        // Ensure videos is an array before attempting to map
        if (!Array.isArray(videos)) {
            console.error('Received invalid video data:', videos);
            return [];
        }

        return videos.map(video => ({
            id: video.url.split('?v=')[1] || video.url.split('/').pop(),
            title: video.title,
            thumbnail: `https://i.ytimg.com/vi/${video.url.split('?v=')[1] || video.url.split('/').pop()}/mqdefault.jpg`,
            channelTitle: video.uploaderName,
            viewCount: parseInt(video.views) || 0,
            duration: video.duration || 0,
            publishedAt: video.uploaded || null,
            description: video.description || '',
            channelId: video.uploaderUrl ? video.uploaderUrl.split('/').pop() : ''
        }));
    }
}

module.exports = PipedAPI;