interface ElectronAPI {
    searchVideos: (query: string, page: number) => Promise<any>;
    getTrending: (page: number) => Promise<any>;
    selectFolder: () => Promise<string>;
    openFile: (path: string) => Promise<void>;
    openFolder: (path: string) => Promise<void>;
    startDownload: (options: any) => Promise<any>;
    onDownloadProgress: (callback: (progress: number) => void) => void;
    onPhaseChange: (callback: (phase: string) => void) => void;
  }
  
  declare global {
    interface Window {
      electronAPI: ElectronAPI;
    }
  }
  