import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, startWith, switchMap, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  private http = inject(HttpClient);
  public status = signal<'connected' | 'disconnected' | 'connecting'>('disconnected');

  constructor() {
    this.startPollingStatus();
  }

  private startPollingStatus() {
    // Poll the status every 5 seconds
    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.http.get<{ status: 'connected' | 'disconnected' | 'connecting' }>('/api/mqtt/status')),
        catchError(() => of({ status: 'disconnected' as const }))
      )
      .subscribe((response) => {
        this.status.set(response.status);
      });
  }

  public publish(message: any) {
    if (this.status() === 'connected') {
      this.http.post('/api/mqtt/publish', { message })
        .subscribe({
          next: () => {
            console.log('Published message via server');
          },
          error: (err) => {
            console.error('Failed to publish message via server:', err);
          }
        });
    } else {
      console.error('Cannot publish: MQTT server client not connected');
    }
  }
}
