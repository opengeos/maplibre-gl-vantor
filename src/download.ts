import type { StacItem } from './types';

export class Downloader {
  private abortController: AbortController | null = null;

  async downloadItems(
    items: StacItem[],
    getCogUrl: (item: StacItem) => string | null,
    onProgress?: (current: number, total: number, message: string) => void,
  ): Promise<{ completed: number; failed: number }> {
    this.abortController = new AbortController();
    const total = items.length;
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      if (this.abortController.signal.aborted) break;

      const item = items[i];
      const cogUrl = getCogUrl(item);
      if (!cogUrl) {
        failed++;
        continue;
      }

      const filename = `${item.id}.tif`;

      try {
        onProgress?.(i, total, `Downloading ${filename}...`);

        const response = await fetch(cogUrl, {
          signal: this.abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();

        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        completed++;
        onProgress?.(i + 1, total, `Downloaded ${filename} (${completed}/${total})`);
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          onProgress?.(i, total, `Download cancelled. ${completed} file(s) completed.`);
          break;
        }
        failed++;
        onProgress?.(
          i + 1,
          total,
          `Failed to download ${filename}: ${(e as Error).message}`,
        );
      }
    }

    this.abortController = null;
    return { completed, failed };
  }

  cancel(): void {
    this.abortController?.abort();
  }
}
