import crypto from 'crypto';

export interface HealthCheckResult {
  score: number;
  statusCode: number;
  contentType: string;
  responseTimeMs: number;
  checkedAt: string;
  checksum: string;
  status: string;
}

/**
 * Executes a real HTTP HEAD request to the media asset URL.
 * Computes health score and a header fingerprint checksum (SHA-256 hash of status+content-type+content-length).
 * NOTE: This checksum is a header fingerprint, not a full file content verification hash.
 */
export async function checkAssetHealth(fileUrl: string): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let statusCode = 0;
  let contentType = '';
  let contentLength = '';
  let status = 'ready';
  let responseTimeMs = 0;

  try {
    const response = await fetch(fileUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'AJN-MediaAssetManager-HealthCheck/1.0'
      }
    });
    clearTimeout(timeoutId);
    statusCode = response.status;
    contentType = response.headers.get('content-type') || '';
    contentLength = response.headers.get('content-length') || '0';
    responseTimeMs = Date.now() - startTime;

    // Checksum: SHA-256 hash of response headers string (status+content-type+content-length)
    const headerString = `${statusCode}|${contentType}|${contentLength}`;
    const checksum = crypto.createHash('sha256').update(headerString).digest('hex');

    let score = 0;
    if (statusCode === 200) {
      const lowerCt = contentType.toLowerCase();
      const isM3u8 = lowerCt.includes('mpegurl') || lowerCt.includes('vnd.apple.mpegurl') || fileUrl.endsWith('.m3u8');
      const isMp4 = lowerCt.includes('mp4') || fileUrl.endsWith('.mp4');
      const isWebm = lowerCt.includes('webm') || fileUrl.endsWith('.webm');

      if (isM3u8 || isMp4 || isWebm || lowerCt.includes('octet-stream') || lowerCt.includes('video') || lowerCt === '') {
        score = responseTimeMs < 1000 ? 98 : 92;
        status = 'ready';
      } else {
        score = 70; // 200 OK but content-type mismatch
        status = 'warning';
      }
    } else {
      score = 15;
      status = 'error';
    }

    return {
      score,
      statusCode,
      contentType,
      responseTimeMs,
      checkedAt,
      checksum,
      status
    };
  } catch (err) {
    clearTimeout(timeoutId);
    responseTimeMs = Date.now() - startTime;
    const headerString = `0|error|0`;
    const checksum = crypto.createHash('sha256').update(headerString).digest('hex');

    return {
      score: 10,
      statusCode: 0,
      contentType: 'error',
      responseTimeMs,
      checkedAt,
      checksum,
      status: 'error'
    };
  }
}
