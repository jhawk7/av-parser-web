import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CONFIG } from './config';

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
    return this.http.get<JobResponse>(CONFIG.apiUrl);
  }
}
