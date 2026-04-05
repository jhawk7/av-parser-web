import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Job {
  id: string;
  url: string;
  type: 'video' | 'audio';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

export interface JobResponse {
  response: Job[];
}

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private http = inject(HttpClient);

  getJobs(): Observable<JobResponse> {
    // Use the local proxied API instead of the direct external API
    return this.http.get<JobResponse>('/api/jobs');
  }
}
