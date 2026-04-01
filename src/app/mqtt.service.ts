import { Injectable, signal } from '@angular/core';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { CONFIG } from './config';

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  private client: MqttClient | null = null;
  public status = signal<'connected' | 'disconnected' | 'connecting'>('disconnected');

  constructor() {
    this.connect();
  }

  private connect() {
    this.status.set('connecting');
    
    const options: IClientOptions = {
      clientId: CONFIG.mqtt.clientId,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    };

    if (CONFIG.mqtt.username) {
      options.username = CONFIG.mqtt.username;
    }
    if (CONFIG.mqtt.password) {
      options.password = CONFIG.mqtt.password;
    }
    
    try {
      this.client = mqtt.connect(CONFIG.mqtt.url, options);

      this.client.on('connect', () => {
        console.log('Connected to MQTT broker');
        this.status.set('connected');
      });

      this.client.on('error', (err) => {
        console.error('MQTT connection error:', err);
        this.status.set('disconnected');
      });

      this.client.on('close', () => {
        console.log('MQTT connection closed');
        this.status.set('disconnected');
      });
    } catch (error) {
      console.error('Failed to initiate MQTT connection:', error);
      this.status.set('disconnected');
    }
  }

  public publish(topic: string, message: any) {
    if (this.client && this.status() === 'connected') {
      const payload = JSON.stringify(message);
      this.client.publish(topic, payload, { qos: 2 }, (error) => {
        if (error) {
          console.error('Failed to publish message:', error);
        } else {
          console.log('Published message to topic:', topic);
        }
      });
    } else {
      console.error('Cannot publish: MQTT client not connected');
    }
  }
}
