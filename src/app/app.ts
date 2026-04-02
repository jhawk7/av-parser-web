import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MqttService } from './mqtt.service';
import { JobsService, Job } from './jobs.service';
import { CONFIG } from './config';

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
  
  url = '';
  parseType: 'video' | 'audio' = 'video';
  isSubmitting = signal(false);
  lastMessage = signal<string | null>(null);
  isDarkMode = signal(false);
  
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
        this.jobs.set(data.response);
        this.isLoadingJobs.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch jobs:', err);
        this.isLoadingJobs.set(false);
      }
    });
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

      this.mqtt.publish(CONFIG.mqtt.topic, payload);
      
      this.lastMessage.set('Sent');
      this.isSubmitting.set(false);
      
      // Clear message after 3 seconds
      setTimeout(() => this.lastMessage.set(null), 3000);
      
      // Clear URL
      this.url = '';
      
      // Refresh jobs list after a short delay
      setTimeout(() => this.fetchJobs(), 2000);
    }
  }
}
