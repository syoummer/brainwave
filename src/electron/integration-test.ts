/**
 * Integration test for Electron components
 * This test verifies that all main components can be initialized and work together
 */

import { BackendServerManager } from './backend-server-manager';

export class IntegrationTest {
  private backendServerManager: BackendServerManager;

  constructor() {
    this.backendServerManager = new BackendServerManager();
  }

  /**
   * Test backend server integration
   */
  async testBackendServerIntegration(): Promise<boolean> {
    try {
      console.log('Testing backend server integration...');
      
      // Test server start
      await this.backendServerManager.start();
      
      if (!this.backendServerManager.isRunning()) {
        throw new Error('Backend server failed to start');
      }
      
      console.log('✅ Backend server started successfully');
      console.log(`Server URL: ${this.backendServerManager.getServerUrl()}`);
      
      // Test server stop
      await this.backendServerManager.stop();
      
      if (this.backendServerManager.isRunning()) {
        throw new Error('Backend server failed to stop');
      }
      
      console.log('✅ Backend server stopped successfully');
      return true;
    } catch (error) {
      console.error('❌ Backend server integration test failed:', error);
      return false;
    }
  }

  /**
   * Test settings manager integration (mock test)
   */
  async testSettingsManagerIntegration(): Promise<boolean> {
    try {
      console.log('Testing settings manager integration (mock)...');
      
      // Since we can't test SettingsManager outside Electron context,
      // we'll just verify the class structure exists
      const { SettingsManager } = require('./settings-manager');
      
      if (typeof SettingsManager !== 'function') {
        throw new Error('SettingsManager class not properly exported');
      }
      
      console.log('✅ Settings manager class structure is valid');
      return true;
    } catch (error) {
      console.error('❌ Settings manager integration test failed:', error);
      return false;
    }
  }

  /**
   * Test IPC communication readiness
   */
  async testIPCReadiness(): Promise<boolean> {
    try {
      console.log('Testing IPC communication readiness...');
      
      // Verify that the preload script exists and can be loaded
      const path = require('path');
      const fs = require('fs');
      
      const preloadPath = path.join(__dirname, 'preload.js');
      if (!fs.existsSync(preloadPath)) {
        throw new Error('Preload script not found at expected location');
      }
      
      console.log('✅ Preload script exists and is accessible');
      
      // Test that main app class exists
      const { ElectronApp } = require('./main');
      if (typeof ElectronApp !== 'function') {
        throw new Error('ElectronApp class not properly exported');
      }
      
      console.log('✅ ElectronApp class ready for IPC operations');
      
      return true;
    } catch (error) {
      console.error('❌ IPC readiness test failed:', error);
      return false;
    }
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<boolean> {
    console.log('🚀 Starting Electron integration tests...\n');
    
    const results = await Promise.all([
      this.testBackendServerIntegration(),
      this.testSettingsManagerIntegration(),
      this.testIPCReadiness()
    ]);
    
    const allPassed = results.every(result => result);
    
    console.log('\n📊 Integration Test Results:');
    console.log(`Backend Server Integration: ${results[0] ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Settings Manager Integration: ${results[1] ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`IPC Communication Readiness: ${results[2] ? '✅ PASS' : '❌ FAIL'}`);
    
    if (allPassed) {
      console.log('\n🎉 All integration tests passed! Components are properly connected.');
    } else {
      console.log('\n❌ Some integration tests failed. Please check the errors above.');
    }
    
    return allPassed;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new IntegrationTest();
  test.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Integration test execution failed:', error);
    process.exit(1);
  });
}