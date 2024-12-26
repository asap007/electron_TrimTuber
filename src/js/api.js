// api.js
const axios = require('axios');

class InvidiousAPI {
    constructor() {
        this.instances = [
            "https://iv.nboeck.de",
            "https://invidious.privacydev.net",
            "https://invidious.flokinet.to",
            "https://vid.puffyan.us"
        ];
        this.currentInstance = this.instances[0];
        this.pageSize = 20;
    }

    async searchVideos(query, page = 1) {
        try {
            const response = await axios.get(`${this.currentInstance}/api/v1/search`, {
                params: {
                    q: query,
                    type: 'video',
                    page: page
                }
            });
            return response.data.map(video => ({
                id: video.videoId,
                title: video.title,
                thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
                channelTitle: video.author,
                viewCount: video.viewCount || 0,
                duration: video.lengthSeconds || 0
            }));
        } catch (error) {
            console.error('Search error:', error);
            if (this.instances.length > 1) {
                this.currentInstance = this.instances[
                    (this.instances.indexOf(this.currentInstance) + 1) % this.instances.length
                ];
                return this.searchVideos(query, page);
            }
            return [];
        }
    }

    async getTrending(page = 1) {
        try {
            const response = await axios.get(`${this.currentInstance}/api/v1/trending`, {
                params: {
                    page: page
                }
            });
            return response.data.map(video => ({
                id: video.videoId,
                title: video.title,
                thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
                channelTitle: video.author,
                viewCount: video.viewCount || 0,
                duration: video.lengthSeconds || 0
            }));
        } catch (error) {
            console.error('Trending error:', error);
            if (this.instances.length > 1) {
                this.currentInstance = this.instances[
                    (this.instances.indexOf(this.currentInstance) + 1) % this.instances.length
                ];
                return this.getTrending(page);
            }
            return [];
        }
    }
}

module.exports = InvidiousAPI;