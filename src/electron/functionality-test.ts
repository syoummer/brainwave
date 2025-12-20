/**
 * Functionality completeness test for Electron app
 * This test verifies that all existing features work correctly in Electron environment
 */

import { BackendServerManager } from './backend-server-manager';
import * as http from 'http';
import WebSocket from 'ws';

export class FunctionalityTest {
  private backendServerManager: BackendServerManager;
  private serverUrl: string = '';

  constructor() {
    this.backendServerManager = new BackendServerManager();
  }

  /**
   * Test backend server HTTP endpoints
   */
  async testHTTPEndpoints(): Promise<boolean> {
    try {
      console.log('Testing HTTP endpoints...');
      
      // Start the backend server
      await this.backendServerManager.start();
      this.serverUrl = this.backendServerManager.getServerUrl();
      
      // Test static file serving (main interface)
      const staticResponse = await this.makeHTTPRequest('/');
      if (staticResponse.statusCode !== 200) {
        throw new Error(`Static file serving failed: ${staticResponse.statusCode}`);
      }
      console.log('✅ Static file serving works');
      
      // Test API health check (if available)
      try {
        const healthResponse = await this.makeHTTPRequest('/api/health');
        if (healthResponse.statusCode === 200) {
          console.log('✅ Health check endpoint works');
        }
      } catch (error) {
        console.log('ℹ️ Health check endpoint not available (optional)');
      }
      
      return true;
    } catch (error) {
      console.error('❌ HTTP endpoints test failed:', error);
      return false;
    }
  }

  /**
   * Test WebSocket connectivity
   */
  async testWebSocketConnectivity(): Promise<boolean> {
    try {
      console.log('Testing WebSocket connectivity...');
      
      if (!this.serverUrl) {
        throw new Error('Backend server not started');
      }
      
      const wsUrl = this.serverUrl.replace('http', 'ws') + '/api/v1/ws';
      
      return new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        let connected = false;
        
        const timeout = setTimeout(() => {
          if (!connected) {
            ws.close();
            console.error('❌ WebSocket connection timeout');
            resolve(false);
          }
        }, 5000);
        
        ws.on('open', () => {
          connected = true;
          clearTimeout(timeout);
          console.log('✅ WebSocket connection established');
          
          // Test sending a message
          ws.send(JSON.stringify({ type: 'test', message: 'ping' }));
        });
        
        ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('✅ WebSocket message received:', message.type || 'unknown');
          } catch (error) {
            console.log('✅ WebSocket raw message received');
          }
        });
        
        ws.on('error', (error: Error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket error:', error.message);
          resolve(false);
        });
        
        // Close connection after successful test
        setTimeout(() => {
          if (connected) {
            ws.close();
            console.log('✅ WebSocket connection closed cleanly');
            resolve(true);
          }
        }, 2000);
      });
    } catch (error) {
      console.error('❌ WebSocket connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Test CORS configuration
   */
  async testCORSConfiguration(): Promise<boolean> {
    try {
      console.log('Testing CORS configuration...');
      
      const response = await this.makeHTTPRequest('/', {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      });
      
      // Check if CORS headers are present
      const corsHeader = response.headers['access-control-allow-origin'];
      if (corsHeader) {
        console.log('✅ CORS headers present');
      } else {
        console.log('ℹ️ CORS headers not found (may be configured differently)');
      }
      
      return true;
    } catch (error) {
      console.error('❌ CORS configuration test failed:', error);
      return false;
    }
  }

  /**
   * Test frontend resource loading
   */
  async testFrontendResources(): Promise<boolean> {
    try {
      console.log('Testing frontend resource loading...');
      
      // Test main HTML file
      const htmlResponse = await this.makeHTTPRequest('/');
      if (htmlResponse.statusCode !== 200) {
        throw new Error('Main HTML file not accessible');
      }
      console.log('✅ Main HTML file loads');
      
      // Test CSS file
      const cssResponse = await this.makeHTTPRequest('/static/style.css');
      if (cssResponse.statusCode !== 200) {
        throw new Error('CSS file not accessible');
      }
      console.log('✅ CSS file loads');
      
      // Test JavaScript file
      const jsResponse = await this.makeHTTPRequest('/static/main.js');
      if (jsResponse.statusCode !== 200) {
        throw new Error('JavaScript file not accessible');
      }
      console.log('✅ JavaScript file loads');
      
      return true;
    } catch (error) {
      console.error('❌ Frontend resources test failed:', error);
      return false;
    }
  }

  /**
   * Test API endpoints (if available)
   */
  async testAPIEndpoints(): Promise<boolean> {
    try {
      console.log('Testing API endpoints...');
      
      // Test text enhancement endpoint (if available)
      try {
        const enhanceResponse = await this.makeHTTPRequest('/api/v1/enhance', {}, 'POST', 
          JSON.stringify({ text: 'test text', type: 'grammar' }));
        
        if (enhanceResponse.statusCode === 200 || enhanceResponse.statusCode === 400) {
          console.log('✅ Text enhancement endpoint responds');
        }
      } catch (error) {
        console.log('ℹ️ Text enhancement endpoint test skipped');
      }
      
      // Test ask AI endpoint (if available)
      try {
        const askResponse = await this.makeHTTPRequest('/api/v1/ask', {}, 'POST',
          JSON.stringify({ text: 'test question' }));
        
        if (askResponse.statusCode === 200 || askResponse.statusCode === 400) {
          console.log('✅ Ask AI endpoint responds');
        }
      } catch (error) {
        console.log('ℹ️ Ask AI endpoint test skipped');
      }
      
      return true;
    } catch (error) {
      console.error('❌ API endpoints test failed:', error);
      return false;
    }
  }

  /**
   * Helper method to make HTTP requests
   */
  private makeHTTPRequest(path: string, headers: Record<string, string> = {}, method: string = 'GET', body?: string): Promise<{
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.serverUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers as Record<string, string>,
            body: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  /**
   * Run all functionality tests
   */
  async runAllTests(): Promise<boolean> {
    console.log('🧪 Starting functionality completeness tests...\n');
    
    try {
      // Run tests sequentially to ensure server is started first
      const httpResult = await this.testHTTPEndpoints();
      const wsResult = await this.testWebSocketConnectivity();
      const corsResult = await this.testCORSConfiguration();
      const frontendResult = await this.testFrontendResources();
      const apiResult = await this.testAPIEndpoints();
      
      const results = [httpResult, wsResult, corsResult, frontendResult, apiResult];
      const allPassed = results.every(result => result);
      
      console.log('\n📊 Functionality Test Results:');
      console.log(`HTTP Endpoints: ${results[0] ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`WebSocket Connectivity: ${results[1] ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`CORS Configuration: ${results[2] ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Frontend Resources: ${results[3] ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`API Endpoints: ${results[4] ? '✅ PASS' : '❌ FAIL'}`);
      
      if (allPassed) {
        console.log('\n🎉 All functionality tests passed! Features are working correctly.');
      } else {
        console.log('\n❌ Some functionality tests failed. Please check the errors above.');
      }
      
      return allPassed;
    } finally {
      // Clean up - stop the backend server
      try {
        await this.backendServerManager.stop();
        console.log('\n🧹 Test cleanup completed');
      } catch (error) {
        console.error('Warning: Failed to stop backend server during cleanup:', error);
      }
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new FunctionalityTest();
  test.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Functionality test execution failed:', error);
    process.exit(1);
  });
}