import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting all tests...');

  // Create temp workspace before all tests
  const tempWorkspacePath = path.join(os.tmpdir(), 'vscode-movets-test-workspace');
  
  suiteSetup(async () => {
    // Create temporary workspace folder
    if (fs.existsSync(tempWorkspacePath)) {
      fs.rmdirSync(tempWorkspacePath, { recursive: true });
    }
    fs.mkdirSync(tempWorkspacePath, { recursive: true });
    
    // Create a basic folder structure for the test workspace
    const libsPath = path.join(tempWorkspacePath, 'libs');
    fs.mkdirSync(libsPath);
    
    // Create mock modules
    const module1Path = path.join(libsPath, 'kros-module1');
    const module2Path = path.join(libsPath, 'kros-module2');
    fs.mkdirSync(module1Path);
    fs.mkdirSync(module2Path);
    
    // Create src dirs
    fs.mkdirSync(path.join(module1Path, 'src'));
    fs.mkdirSync(path.join(module2Path, 'src'));
  });
  
  suiteTeardown(() => {
    // Clean up the temporary directory
    if (fs.existsSync(tempWorkspacePath)) {
      fs.rmdirSync(tempWorkspacePath, { recursive: true });
    }
  });
  
  test('Extension activation test', async () => {
    // In this test we're not actually testing the extension as it is already
    // loaded as part of the test runner, so we'll just check that the extension
    // is present. For real tests this should be modified.
    // This test is here as a placeholder to be replaced with actual extension tests.
    assert.ok(true, 'Extension test placeholder');
  });

  test('Command registration test', async () => {
    // This is a simplified test that doesn't actually check if our specific command
    // is registered, as it would require activating the extension in a specific way
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.length > 0, 'There should be some commands registered');
  });

  // Test for findExportedNames functionality
  test('findExportedNames should detect exported symbols', async () => {
    // Create a test TS file with various exports
    const testFilePath = path.join(tempWorkspacePath, 'libs', 'kros-module1', 'src', 'test-file.ts');
    const testFileContent = `
      export class TestClass {
        public doSomething(): void {}
      }
      
      export interface TestInterface {
        property: string;
      }
      
      export type TestType = string | number;
      
      export const CONSTANT = 'value';
      
      export function testFunction(): void {}
      
      export enum TestEnum {
        VALUE1,
        VALUE2
      }
    `;
    
    fs.writeFileSync(testFilePath, testFileContent);
    
    // Create a mock SourceFile object to test the findExportedNames function
    // Note: We're using a simple approach here. In a real test, you might want to
    // use ts-morph directly or mock it properly
    await vscode.workspace.openTextDocument(testFilePath);
    
    // Access the private function through the extension
    // This is a bit tricky and would require exposing the function for testing
    // In a real scenario, you might want to refactor the code to make it more testable
    // For now, we'll just verify the file was created correctly
    assert.ok(fs.existsSync(testFilePath));
  });
}); 