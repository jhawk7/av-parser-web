import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CONFIG } from './config';

export interface Job {
  id: string;
  url: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private http = inject(HttpClient);

  getJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(CONFIG.apiUrl);
  }
}
