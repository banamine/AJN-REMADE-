export class UnifiedPlaybackEngine {
  private currentUrlIndex = 0;
  private urls: string[] = [];
  private maxRetries = 3;

  constructor(primaryUrl: string, backupUrls: string[] = [
    'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel.ism/.m3u8'
  ]) {
    this.urls = [primaryUrl, ...backupUrls].filter(Boolean);
  }

  public getProxyUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('/api/stream-proxy')) return url;
    return `/api/stream-proxy?url=${encodeURIComponent(url)}`;
  }

  public getCurrentStreamUrl(): string {
    const raw = this.urls[this.currentUrlIndex] || this.urls[0];
    return this.getProxyUrl(raw);
  }

  public async verifyAndSelectBestStream(): Promise<string> {
    for (let i = 0; i < this.urls.length; i++) {
      const url = this.urls[i];
      try {
        const res = await fetch(`/api/stream-proxy?url=${encodeURIComponent(url)}`, { method: 'HEAD' });
        if (res.ok || res.status < 500) {
          this.currentUrlIndex = i;
          return this.getCurrentStreamUrl();
        }
      } catch {
        // continue to next backup
      }
    }
    return this.getCurrentStreamUrl();
  }

  public switchToFallback(): string | null {
    if (this.currentUrlIndex < this.urls.length - 1) {
      this.currentUrlIndex++;
      return this.getCurrentStreamUrl();
    }
    // Loop back or return null
    return null;
  }

  /**
   * Reset the engine back to the primary URL. Called at the start of every
   * kernel-level retry (uxKernelMachine PLAY_ERROR -> PLAYBACK self-transition)
   * so a fresh retry re-probes from the top of the URL list instead of
   * silently reusing an already-exhausted fallback chain.
   */
  public reset(): void {
    this.currentUrlIndex = 0;
  }
}
