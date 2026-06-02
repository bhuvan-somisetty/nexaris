import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 20 }, // Ramp-up to 20 users
    { duration: '30s', target: 50 }, // Stress test at 50 concurrent users
    { duration: '15s', target: 0 },  // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'], // 95% of requests must complete in under 250ms
  },
};

const BASE_URL = 'http://localhost:3001/api';

export default function () {
  // 1. Perform fuzzy trigram search
  const searchRes = http.get(`${BASE_URL}/search?q=hedphone`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search latency p95 < 250ms': (r) => r.timings.duration < 250,
  });
  sleep(1);

  // 2. Query trending searches
  const trendingRes = http.get(`${BASE_URL}/search/trending`);
  check(trendingRes, {
    'trending queries status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
