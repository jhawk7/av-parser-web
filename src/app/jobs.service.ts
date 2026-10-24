import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';

export interface Job {
  id: string;
  url: string;
  type: 'video' | 'audio' | 'both';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  updatedAt: string;
}

export interface JobResponse {
  response: Job[];
}

export interface JobMap {
  [id: string]: Job;
}

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private client = inject(HttpClient);

  // Single EventSource shared via BehaviorSubject
  private sseStream$: BehaviorSubject<JobResponse> = new BehaviorSubject<JobResponse>(null as any);
  private eventSourceRef: EventSource | null = null;
  private initialized = false;

  getJobs(): Observable<JobResponse> {
    return this.client.get<JobResponse>('/api/jobs');
  }

  /**
   * Get live SSE updates. First subscription initializes connection; subsequent ones share it.
   */
  getUpdatedJobs(): Observable<JobResponse> {
    // Lazy init on first subscriber
    this.ensureSSE();
    return this.sseStream$.asObservable();
  }

  /**
   * Initialize EventSource once, attach handler broadcast to all subscribers.
   */
  private ensureSSE(): void {
    if (this.initialized) return;

    this.eventSourceRef = new EventSource('/api/stream/jobs');

    const closeAll = () => {}; // Keep alive for multiple subscribers

    // Handler broadcasts updates to BehaviorSubject (shared by all subs)
    const handleMessage = (event: MessageEvent) => {
      try {
        const data: JobResponse = JSON.parse(event.data);
        this.sseStream$.next(data);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    const handleError = () => {
      console.error('SSE connection error');
      if (this.eventSourceRef) {
        this.eventSourceRef.close();
        setTimeout(() => this.ensureSSE(), 3000);
      }
    };

    // Attach handler once per connection
    (this.eventSourceRef as any).onmessage = handleMessage;
    (this.eventSourceRef as any).onopen = () => {};
    (this.eventSourceRef as any).error = handleError;

    this.initialized = true;
  }
}
