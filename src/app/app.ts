import { Component, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { MqttService } from './mqtt.service';
import { JobsService, Job, JobMap } from './jobs.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class App implements OnInit {
  protected readonly mqtt = inject(MqttService);
  private readonly jobsService = inject(JobsService);
  private readonly destroyRef = inject(DestroyRef);
  private sseSubscription: Subscription | null = null;
  private observedPendingJob = false;

  url = '';
  parseType: 'video' | 'audio' | 'both' = 'video';
  isSubmitting = signal(false);
  lastMessage = signal<string | null>(null);
  isDarkMode = signal(true);
  isUpdatingJobs = signal(false);

  // Jobs history
  jobs = signal<Job[]>([]);
  isLoadingJobs = signal(false);
  showHistory = signal(false);

  ngOnInit() {
    this.fetchJobs();
  }

  fetchJobs() {
    this.isLoadingJobs.set(true);
    this.jobsService.getJobs().subscribe({
      next: (data) => {
        const jobList = data.response || [];
        this.jobs.set(jobList);
        this.isLoadingJobs.set(false);

        // If there are pending jobs, track their updates
        if (jobList.some(job => job.status === 'pending')) {
          this.observedPendingJob = true;
          this.startJobUpdates();
        }
      },
      error: (err) => {
        console.error('Failed to fetch jobs:', err);
        this.isLoadingJobs.set(false);
      }
    });
  }

  startJobUpdates() {
    if (this.sseSubscription && !this.sseSubscription.closed) {
      return;
    }

    this.isUpdatingJobs.set(true);

    this.sseSubscription = this.jobsService.getUpdatedJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (!data?.response || !Array.isArray(data.response)) {
            if (data?.error) {
              console.warn('SSE received error from upstream:', data.error);
            }
            return;
          }

          const jobMap: JobMap = {};
          this.jobs().forEach(job => {
            jobMap[job.id] = job;
          });

          data.response.forEach(updatedJob => {
            jobMap[updatedJob.id] = updatedJob;
          });

          // Sort jobs by newest timestamp
          const updatedJobsList = Object.values(jobMap).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          this.jobs.set(updatedJobsList);

          const hasPending = updatedJobsList.some(job => job.status === 'pending');
          if (hasPending) {
            this.observedPendingJob = true;
          } else if (this.observedPendingJob && !hasPending) {
            // All previously pending jobs have finished; close SSE connection
            this.stopJobUpdates();
            this.observedPendingJob = false;
          }
        },
        error: (err) => {
          console.error('Failed to fetch job updates:', err);
          this.stopJobUpdates();
        }
      });
  }

  stopJobUpdates() {
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
      this.sseSubscription = null;
    }
    this.isUpdatingJobs.set(false);
  }

  toggleTheme() {
    this.isDarkMode.update(dark => !dark);
  }

  toggleHistory() {
    this.showHistory.update(show => !show);
    if (this.showHistory()) {
      this.fetchJobs();
    }
  }

  isValidUrl(): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(this.url);
  }

  onSubmit() {
    if (this.isValidUrl()) {
      this.isSubmitting.set(true);
      const payload = {
        url: this.url,
        type: this.parseType,
      };

      this.mqtt.publish(payload);

      this.lastMessage.set('Sent');
      this.isSubmitting.set(false);

      // Clear message after 3 seconds
      setTimeout(() => this.lastMessage.set(null), 3000);

      // Clear URL immediately so user can submit again
      this.url = '';

      // Mark that we are expecting a pending job from this submission
      this.observedPendingJob = true;

      // Wait 2s for backend to process job, then refresh jobs list and start live SSE updates
      setTimeout(() => {
        this.fetchJobs();
        this.startJobUpdates();
      }, 2000);
    }
  }
}
