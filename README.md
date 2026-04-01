# AV Parser Web

A simple Angular standalone application that allows users to submit YouTube URLs for video or audio processing via MQTT. It also provides a history view of jobs from the last 7 days via a REST API.

## Features
- **YouTube URL Validation**: Ensures only valid links are submitted.
- **Processing Options**: Choose between Video or Audio parsing.
- **MQTT Integration**: Publishes jobs directly to a broker.
- **Job History**: View recent and current jobs with status tracking.
- **Dark Mode**: Fully responsive UI with a sleek dark theme toggle.
- **Dockerized**: Ready for containerized deployment with runtime configuration.

---

## Prerequisites
- **Node.js**: v22 or higher
- **pnpm**: v10 or higher
- **Docker & Docker Compose**: (Optional, for containerized run)

---

## Configuration

The application uses environment variables for configuration. Create a `.env` file in the root directory:

```env
MQTT_URL=
MQTT_CLIENT_ID=
MQTT_USER=
MQTT_PASSWORD=
MQTT_TOPIC=
API_URL=
```

> **Note**: For browser compatibility, `MQTT_URL` must use the WebSocket protocol (`ws://` or `wss://`).

---

## Local Development

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Start Development Server**:
   ```bash
   pnpm start
   ```
   The app will be available at `http://localhost:4200`.

---

## Running with Docker

This project is fully dockerized and supports **runtime configuration injection**. You can change your `.env` file and restart the container without rebuilding the image.

1. **Build and Run**:
   ```bash
   docker compose up -d --build
   ```

2. **Access the App**:
   The application will be served via Nginx at `http://localhost:8080`.

3. **Updating Configuration**:
   If you change a value in `.env`, simply restart the container:
   ```bash
   docker compose restart
   ```

---

## Technical Details

- **Framework**: Angular (Standalone Components)
- **State Management**: Angular Signals
- **MQTT Client**: `mqtt.js`
- **Build Tool**: Vite (via Angular CLI)
- **Container**: Multi-stage build (Node.js -> Nginx Unprivileged)
- **Security**: Runs as a non-root user (UID 101) in Docker.

## Project Structure
- `src/app/app.ts`: Main logic and UI components.
- `src/app/mqtt.service.ts`: MQTT connection management.
- `src/app/jobs.service.ts`: API interaction for job history.
- `scripts/set-env.ts`: Script to sync `.env` with Angular config.
- `entrypoint.sh`: Injects environment variables into the Docker container at runtime.
