import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, share } from 'rxjs';

export interface Job {
  id: string;
  url: string;
  type: 'video' | 'audio' | 'both';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  updatedAt: string;
}

export interface JobResponse {
  response?: Job[];
  error?: string;
}

export interface JobMap {
  [id: string]: Job;
}

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private client = inject(HttpClient);
  private jobsStream$: Observable<JobResponse> | null = null;

  getJobs(): Observable<JobResponse> {
    return this.client.get<JobResponse>('/api/jobs');
  }

  /**
   * Get live SSE updates. Automatically connects on first subscription and
   * gracefully closes the EventSource when all subscribers unsubscribe.
   */
  getUpdatedJobs(): Observable<JobResponse> {
    if (!this.jobsStream$) {
      this.jobsStream$ = new Observable<JobResponse>((subscriber) => {
        const eventSource = new EventSource('/api/stream/jobs');

        eventSource.onmessage = (event: MessageEvent) => {
          try {
            const data: JobResponse = JSON.parse(event.data);
            subscriber.next(data);
          } catch (e) {
            console.error('Failed to parse SSE message:', e);
          }
        };

        eventSource.onerror = (err) => {
          // EventSource will auto-reconnect if readyState is CONNECTING (0).
          // Only notify error if connection is permanently CLOSED (2).
          if (eventSource.readyState === EventSource.CLOSED) {
            console.error('SSE connection permanently closed');
            subscriber.error(err);
          }
        };

        return () => {
          eventSource.close();
        };
      }).pipe(
        share({
          resetOnRefCountZero: true,
          resetOnError: true,
          resetOnComplete: true,
        })
      );
    }

    return this.jobsStream$;
  }
}
