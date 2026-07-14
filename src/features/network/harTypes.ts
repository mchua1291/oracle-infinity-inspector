export interface HarEntry {
  startedDateTime?: string;
  time?: number;
  request: {
    method?: string;
    url: string;
    postData?: { mimeType?: string; text?: string };
  };
  response?: {
    status?: number;
    statusText?: string;
  };
}

export interface HarLog {
  entries: HarEntry[];
}
