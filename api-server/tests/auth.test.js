const request = require('supertest');
const { setupTestDatabase, cleanupTestData, testAuthentication, validateResponse, validateErrorResponse, createTestData } = require('./setup');

describe('Authentication API', () => {
  let testUser, testToken;

  beforeAll(async () => {
    const { testUser, testToken } = await setupTestDatabase();
    testUser = testUser;
    testToken = testToken;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/auth/login', () => {
    const validLogin = {
      email: 'test@example.com',
      password: 'testpassword'
    };

    it('should authenticate user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLogin);

      validateResponse(response, 200);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toMatchObject({
        id: expect.any(String),
        email: validLogin.email,
        role: expect.any(String),
        tenantId: expect.any(String)
      });
    });

    it('should reject invalid email', async () => {
      const invalidLogin = {
        email: 'invalid@example.com',
        password: 'testpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLogin);

      validateErrorResponse(response, 401, 'Invalid credentials');
    });

    it('should reject missing password', async () => {
      const incompleteLogin = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(incompleteLogin);

      validateErrorResponse(response, 400, 'Password is required');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      validateErrorResponse(response, 400, 'Email and password are required');
    });

    it('should handle rate limiting', async () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'testpassword'
      };

      // Simulate multiple rapid requests
      const requests = Array(6).fill().map(() =>
        request(app).post('/api/auth/login').send(validLogin)
      );

      const responses = await Promise.allSettled(requests);

      // First few should succeed, then hit rate limit
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBeLessThanOrEqual(5); // Some should succeed before hitting limit
      expect(rateLimitCount).toBeGreaterThan(0); // Some should hit rate limit
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com", "password": "testpassword}');

      validateResponse(response, 200);
      expect(response.body.data.token).toBeDefined();
    });

    it('should sanitize input', async () => {
      const maliciousInput = {
        email: 'test@example.com<script>alert("xss")</script>',
        password: 'testpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousInput);

      // Should sanitize the script tag
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('POST /api/auth/register', () => {
    const validRegistration = {
      email: 'newuser@example.com',
      password: 'newpassword123',
      firstName: 'New',
      lastName: 'User',
      role: 'resident'
    };

    it('should register new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistration);

      validateResponse(response, 201);
      expect(response.body.data.user).toMatchObject({
        email: validRegistration.email,
        firstName: validRegistration.firstName,
        lastName: validRegistration.lastName,
        role: validRegistration.role
      });
    });

    it('should reject duplicate email', async () => {
      const duplicateRegistration = {
        email: 'test@example.com', // Already exists from setup
        password: 'newpassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'resident'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateRegistration);

      validateErrorResponse(response, 400);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate password requirements', async () => {
      const weakPasswordRegistration = {
        email: 'weak@example.com',
        password: '123', // Too weak
        firstName: 'Weak',
        lastName: 'Password',
        role: 'resident'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordRegistration);

      validateErrorResponse(response, 400);
      expect(response.body.message).toContain('Password must be at least');
    });

    it('should validate email format', async () => {
      const invalidEmailRegistration = {
        email: 'invalid-email',
        password: 'validpassword123',
        firstName: 'Invalid',
        lastName: 'Email',
        role: 'resident'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailRegistration);

      validateErrorResponse(response, 400);
      expect(response.body.message).toContain('valid email');
    });

    it('should validate required fields', async () => {
      const incompleteRegistration = {
        email: 'incomplete@example.com'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteRegistration);

      validateErrorResponse(response, 400);
      expect(response.body.message).toContain('required');
    });
  });

  describe('Token Validation', () => {
    it('should reject malformed JWT', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer malformed.jwt.token');

      validateErrorResponse(response, 401);
    });

    it('should reject expired JWT', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.id, email: testUser.email },
        'expired-secret',
        { expiresIn: '0s' }
      );

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${expiredToken}`);

      validateErrorResponse(response, 401);
    });

    it('should reject invalid signature JWT', async () => {
      const invalidToken = jwt.sign(
        { id: testUser.id, email: testUser.email },
        'different-secret'
      );

      // Modify the token to make it invalid
      const modifiedToken = invalidToken.replace(testUser.id, 'different-user-id');

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${modifiedToken}`);

      validateErrorResponse(response, 401);
    });
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLogin);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });

    it('should handle CORS correctly', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://evil.com')
        .send(validLogin);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should reject large payloads', async () => {
      const largePayload = {
        email: 'a'.repeat(10000), // Very large payload
        password: 'testpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(largePayload);

      expect([413, 400]).toContain(response.status);
    });
  });
});