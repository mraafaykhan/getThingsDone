import { exec } from 'child_process';
import axios from 'axios';
import { jest } from '@jest/globals';

// Mock axios
jest.mock('axios');

// Helper function to run the CLI command
const runCLI = (args = '', callback) => {
  exec(`node index.mjs ${args}`, (error, stdout, stderr) => {
    callback(stdout, stderr, error);
  });
};

describe('CLI Tool Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch all 20 required TODOs', (done) => {
    // Mock successful responses for all 20 TODOs
    const mockTodos = Array.from({ length: 20 }, (_, i) => ({
      id: (i + 1) * 2,
      title: `Todo ${i + 1}`,
      completed: i % 2 === 0,
    }));

    axios.get.mockImplementation((url) => {
      const id = parseInt(url.split('/').pop(), 10);
      const todo = mockTodos.find((t) => t.id === id);
      return Promise.resolve({ data: todo });
    });

    runCLI('--num 20', (stdout, stderr, error) => {
      expect(stderr).toBe('');
      expect(stdout).toContain('Fetching 20 TODOs');
      mockTodos.forEach((todo) => {
        expect(stdout).toContain(`Todo ${todo.id / 2}`);
      });
      done();
    });
  });

  test('should handle failures and retries appropriately', (done) => {
    // Mock responses with some failures
    const mockTodos = Array.from({ length: 22 }, (_, i) => ({
      id: (i + 1) * 2,
      title: `Todo ${i + 1}`,
      completed: i % 2 === 0,
    }));

    axios.get.mockImplementation((url) => {
      const id = parseInt(url.split('/').pop(), 10);
      if (id === 4 || id === 8) {
        return Promise.reject(new Error('Network Error'));
      }
      const todo = mockTodos.find((t) => t.id === id);
      return Promise.resolve({ data: todo });
    });

    runCLI('--num 20 --retries 3', (stdout, stderr, error) => {
      expect(stderr).toBe('');
      expect(stdout).toContain('Fetching 20 TODOs');
      expect(stdout).toContain('Retrying TODO 4');
      expect(stdout).toContain('Retrying TODO 8');
      expect(stdout).toContain('Failed to fetch TODO 4');
      expect(stdout).toContain('Failed to fetch TODO 8');
      done();
    });
  });

  test('should measure performance', (done) => {
    // Mock successful responses for performance measurement
    const mockTodos = Array.from({ length: 20 }, (_, i) => ({
      id: (i + 1) * 2,
      title: `Todo ${i + 1}`,
      completed: i % 2 === 0,
    }));

    axios.get.mockImplementation((url) => {
      const id = parseInt(url.split('/').pop(), 10);
      const todo = mockTodos.find((t) => t.id === id);
      return Promise.resolve({ data: todo });
    });

    const start = Date.now();
    runCLI('--num 20', (stdout, stderr, error) => {
      const end = Date.now();
      const timeTaken = (end - start) / 1000;
      console.log(`Performance test completed in ${timeTaken} seconds`);

      expect(stderr).toBe('');
      expect(stdout).toContain('Fetching 20 TODOs');
      expect(timeTaken).toBeLessThan(10); // Adjust based on expected performance
      done();
    });
  });
});
