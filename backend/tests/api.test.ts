import request from 'supertest';
import app from '../src/server';

describe('TransiMio API Tests', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('GET /api/vehicles/realtime should return vehicles', async () => {
    const response = await request(app)
      .get('/api/vehicles/realtime')
      .set('Authorization', 'Bearer test-token');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /api/alerts/report should create alert', async () => {
    const alert = {
      type: 'accident',
      latitude: 3.4516,
      longitude: -76.532,
      description: 'Accidente de tránsito'
    };

    const response = await request(app)
      .post('/api/alerts/report')
      .set('Authorization', 'Bearer test-token')
      .send(alert);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
