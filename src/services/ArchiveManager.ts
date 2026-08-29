/**
 * Archive Manager Service
 * Handles media normalization, strict mathematical date integrity verification,
 * filename parsing (e.g. 20260828_Fri_WarRoom-Hr3.m4v), HTML source extraction,
 * and curated educational/historical archive records with mediaType isolation.
 */

import { ArchiveMediaRecord, ImportResultSummary } from '../types';

export const CURATED_ARCHIVE_RECORDS: ArchiveMediaRecord[] = [
  {
    id: 'arch-20260828-wr-3',
    sourceUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    filename: '20260828_Fri_WarRoom-Hr3.m4v',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    program: 'War Room',
    segment: 'Hour 3',
    title: 'War Room — Hour 3 (August 28, 2026)',
    extension: 'm4v',
    mediaType: 'video',
    duration: 3600,
    status: 'valid',
    discoveredAt: new Date().toISOString()
  },
  {
    id: 'arch-20260828-wr-2',
    sourceUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    filename: '20260828_Fri_WarRoom-Hr2.m4v',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    program: 'War Room',
    segment: 'Hour 2',
    title: 'War Room — Hour 2 (August 28, 2026)',
    extension: 'm4v',
    mediaType: 'video',
    duration: 3600,
    status: 'valid',
    discoveredAt: new Date().toISOString()
  },
  {
    id: 'arch-20260828-wr-1',
    sourceUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    filename: '20260828_Fri_WarRoom-Hr1.m4v',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    program: 'War Room',
    segment: 'Hour 1',
    title: 'War Room — Hour 1 (August 28, 2026)',
    extension: 'm4v',
    mediaType: 'video',
    duration: 3600,
    status: 'valid',
    discoveredAt: new Date().toISOString()
  },
  {
    id: 'arch-20260828-aj-4',
    sourceUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    filename: '20260828_Fri_AlexJones-Hr4.m4v',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    program: 'Alex Jones Show',
    segment: 'Hour 4',
    title: 'Alex Jones Show — Hour 4 (August 28, 2026)',
    extension: 'm4v',
    mediaType: 'video',
    duration: 3600,
    status: 'valid',
    discoveredAt: new Date().toISOString()
  },
  {
    id: 'arch-20260828-aj-3',
    sourceUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    filename: '20260828_Fri_AlexJones-Hr3.m4v',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    program: 'Alex Jones Show',
    segment: 'Hour 3',
    title: 'Alex Jones Show — Hour 3 (August 28, 2026)',
    extension: 'm4v',
    mediaType: 'video',
    duration: 3600,
    status: 'valid',
    discoveredAt: new Date().toISOString()
  },
  {
    id: 'arch-20260828-int-1',
    sourceUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    filename: '20260828_Fri_ResearchInterview-Session1.mp3',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    program: 'Research Interview',
    segment: 'Session 1',
    title: 'Research Interview — Session 1 (August 28, 2026)',
    extension: 'mp3',
    mediaType: 'audio',
    duration: 3720,
    status: 'valid',
    discoveredAt: new Date().toISOString()
  },
  {
    id: 'arch-20260828-int-2',
    sourceUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    filename: '20260828_Fri_ResearchInterview-Session2.mp3',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    program: 'Research Interview',
    segment: 'Session 2',
    title: 'Research Interview — Session 2 (August 28, 2026)',
    extension: 'mp3',
    mediaType: 'audio',
    duration: 4100,
    status: 'valid',
    discoveredAt: new Date().toISOString()
  },
  {
    id: 'arch-20260827-wr-2',
    sourceUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    filename: '20260827_Thu_WarRoom-Hr2.m4v',
    date: '2026-08-27',
    dayOfWeek: 'Thursday',
    program: 'War Room',
    segment: 'Hour 2',
    title: 'War Room — Hour 2 (August 27, 2026)',
    extension: 'm4v',
    mediaType: 'video',
    duration: 3600,
    status: 'valid',
    discoveredAt: new Date().toISOString()
  },
  {
    id: 'arch-20260827-wr-1',
    sourceUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
    filename: '20260827_Thu_WarRoom-Hr1.m4v',
    date: '2026-08-27',
    dayOfWeek: 'Thursday',
    program: 'War Room',
    segment: 'Hour 1',
    title: 'War Room — Hour 1 (August 27, 2026)',
    extension: 'm4v',
    mediaType: 'video',
    duration: 3600,
    status: 'valid',
    discoveredAt: new Date().toISOString()
  }
];

const DAYS_MAP: Record<string, string> = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday'
};

export class ArchiveManager {
  /**
   * Parses filename with strict date integrity verification and mediaType derivation.
   * Pattern expected: YYYYMMDD_Day_Program-Segment.ext
   * e.g. 20260828_Fri_WarRoom-Hr3.m4v or 20260828_Fri_ResearchInterview-Session1.mp3
   */
  public static parseFilename(filename: string, sourceUrl: string = ''): ArchiveMediaRecord {
    const cleanFilename = filename.trim();
    const extMatch = cleanFilename.match(/\.([0-9a-z]+)$/i);
    const extension = extMatch ? extMatch[1].toLowerCase() : 'm4v';
    const mediaType: 'video' | 'audio' = ['mp3', 'm4a', 'wav', 'aac'].includes(extension) ? 'audio' : 'video';
    
    const baseId = 'arch-' + cleanFilename.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const pattern = /^(\d{4})(\d{2})(\d{2})_([A-Za-z]{3})_([A-Za-z0-9]+)-(.*)\.[a-z0-9]+$/i;
    const match = cleanFilename.match(pattern);

    if (!match) {
      return {
        id: baseId,
        sourceUrl: sourceUrl || (mediaType === 'audio' ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' : 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8'),
        filename: cleanFilename,
        date: new Date().toISOString().split('T')[0],
        dayOfWeek: 'Unknown',
        program: 'General Archive',
        segment: 'Segment',
        title: cleanFilename.replace(/\.[^/.]+$/, ''),
        extension,
        mediaType,
        status: 'valid',
        discoveredAt: new Date().toISOString()
      };
    }

    const [, yearStr, monthStr, dayStr, dayCode, programRaw, segmentRaw] = match;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    
    const dateObj = new Date(year, month - 1, day);
    const calculatedDayIndex = dateObj.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const calculatedDayName = dayNames[calculatedDayIndex];

    const expectedDayName = DAYS_MAP[dayCode] || calculatedDayName;

    let status: ArchiveMediaRecord['status'] = 'valid';
    let integrityError: string | undefined = undefined;

    if (isNaN(dateObj.getTime()) || dateObj.getFullYear() !== year || (dateObj.getMonth() + 1) !== month || dateObj.getDate() !== day) {
      status = 'invalid';
      integrityError = `DATA INTEGRITY ERROR: Invalid calendar date in filename ${cleanFilename}`;
    } else if (calculatedDayName !== expectedDayName) {
      status = 'invalid';
      integrityError = `DATA INTEGRITY ERROR: Weekday code '${dayCode}' does not match calculated calendar day '${calculatedDayName}' for ${dateStr}`;
    }

    const programName = programRaw.replace(/([A-Z])/g, ' $1').trim();
    const segmentName = segmentRaw.replace(/([A-Z])/g, ' $1').replace(/-/g, ' ').trim();
    const title = `${programName} — ${segmentName} (${expectedDayName}, ${dateStr})`;

    return {
      id: `${yearStr}${monthStr}${dayStr}-${programRaw.toLowerCase()}-${segmentRaw.toLowerCase()}`,
      sourceUrl: sourceUrl || (mediaType === 'audio' ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' : 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8'),
      filename: cleanFilename,
      date: dateStr,
      dayOfWeek: expectedDayName,
      program: programName,
      segment: segmentName,
      title,
      extension,
      mediaType,
      duration: 3600,
      status,
      discoveredAt: new Date().toISOString(),
      integrityError
    };
  }

  public static importFromHtmlOrText(htmlContent: string, existingRecords: ArchiveMediaRecord[] = []): ImportResultSummary {
    const existingFilenames = new Set(existingRecords.map(r => r.filename));
    const existingIds = new Set(existingRecords.map(r => r.id));

    const matches = htmlContent.match(/href="([^"]+)"|([a-zA-Z0-9_\-]+\.(m4v|mp4|m3u8|mov|ts|mp3|m4a|wav))/gi) || [];
    const discoveredStrings = new Set<string>();

    for (const m of matches) {
      if (m.startsWith('href=')) {
        const urlMatch = m.match(/href="([^"]+)"/);
        if (urlMatch && urlMatch[1]) {
          const u = urlMatch[1];
          const segs = u.split('/');
          const fname = segs[segs.length - 1];
          if (fname && /\.(m4v|mp4|m3u8|mov|ts|mp3|m4a|wav)$/i.test(fname)) {
            discoveredStrings.add(JSON.stringify({ filename: fname, url: u }));
          }
        }
      } else if (/\.(m4v|mp4|m3u8|mov|ts|mp3|m4a|wav)$/i.test(m)) {
        discoveredStrings.add(JSON.stringify({ filename: m, url: '' }));
      }
    }

    if (discoveredStrings.size === 0) {
      const lines = htmlContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && /\.(m4v|mp4|m3u8|mov|ts|mp3|m4a|wav)$/i.test(trimmed)) {
          const parts = trimmed.split(/\s+/);
          const fname = parts[parts.length - 1];
          const url = parts.length > 1 ? parts[0] : '';
          discoveredStrings.add(JSON.stringify({ filename: fname, url: url.startsWith('http') ? url : '' }));
        }
      }
    }

    let totalDiscovered = 0;
    let validCount = 0;
    let duplicateCount = 0;
    let invalidDateCount = 0;
    const newRecords: ArchiveMediaRecord[] = [];

    for (const itemStr of discoveredStrings) {
      totalDiscovered++;
      const { filename, url } = JSON.parse(itemStr);
      
      if (existingFilenames.has(filename)) {
        duplicateCount++;
        continue;
      }

      const record = this.parseFilename(filename, url);
      existingFilenames.add(filename);

      if (record.status === 'invalid') {
        invalidDateCount++;
      } else {
        validCount++;
      }

      if (!existingIds.has(record.id)) {
        existingIds.add(record.id);
        newRecords.push(record);
      } else {
        duplicateCount++;
      }
    }

    return {
      totalDiscovered: totalDiscovered || newRecords.length,
      validCount,
      duplicateCount,
      invalidDateCount,
      records: newRecords
    };
  }
}
