import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock the findAvailableModules function from the extension
// In a real test, we would expose this function for testing
// Here we're replicating its behavior for testing
async function findAvailableModules(workspaceRoot: string): Promise<string[]> {
  const libsFolder = path.join(workspaceRoot, 'libs');
  
  if (!fs.existsSync(libsFolder)) {
    return [];
  }
  
  const folders = fs.readdirSync(libsFolder, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  return folders
    .filter(folder => folder.startsWith('kros-'))
    .map(folder => folder.replace('kros-', ''));
}

suite('Module Detection Test Suite', () => {
  const tempWorkspacePath = path.join(os.tmpdir(), 'vscode-movets-test-workspace-modules');
  
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
    const modules = [
      'kros-module1',
      'kros-module2',
      'kros-shared',
      'other-folder', // Should be ignored
      'not-a-module'  // Should be ignored
    ];
    
    for (const module of modules) {
      fs.mkdirSync(path.join(libsPath, module));
    }
  });
  
  suiteTeardown(() => {
    // Clean up the temporary directory
    if (fs.existsSync(tempWorkspacePath)) {
      fs.rmdirSync(tempWorkspacePath, { recursive: true });
    }
  });
  
  test('Should detect all kros modules', async () => {
    // Call our mocked version of the function
    const modules = await findAvailableModules(tempWorkspacePath);
    
    // Verify the modules detected
    assert.strictEqual(modules.length, 3, 'Should detect exactly 3 modules');
    assert.ok(modules.includes('module1'), 'Should detect module1');
    assert.ok(modules.includes('module2'), 'Should detect module2');
    assert.ok(modules.includes('shared'), 'Should detect shared module');
    
    // Verify other folders are not included
    assert.ok(!modules.includes('other-folder'), 'Should not include non-kros folders');
    assert.ok(!modules.includes('not-a-module'), 'Should not include non-kros folders');
  });
  
  test('Should return empty array for non-existent libs folder', async () => {
    // Create a new empty folder without libs
    const emptyPath = path.join(os.tmpdir(), 'empty-workspace');
    if (fs.existsSync(emptyPath)) {
      fs.rmdirSync(emptyPath, { recursive: true });
    }
    fs.mkdirSync(emptyPath);
    
    try {
      // Call our mocked version of the function
      const modules = await findAvailableModules(emptyPath);
      
      // Verify empty array is returned
      assert.strictEqual(modules.length, 0, 'Should return empty array for workspace without libs');
    } finally {
      // Clean up
      fs.rmdirSync(emptyPath, { recursive: true });
    }
  });
}); 