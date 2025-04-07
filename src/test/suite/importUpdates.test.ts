import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Project, SourceFile } from 'ts-morph';

suite('Import Updates Test Suite', () => {
  const tempWorkspacePath = path.join(os.tmpdir(), 'vscode-movets-test-workspace-imports');
  let project: Project;
  
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
    const module1SrcPath = path.join(module1Path, 'src');
    const module2SrcPath = path.join(module2Path, 'src');
    fs.mkdirSync(module1SrcPath);
    fs.mkdirSync(module2SrcPath);
    
    // Create files that import from module1
    const files = [
      {
        path: path.join(module1SrcPath, 'component1.ts'),
        content: `
          import { TestComponent } from '@kros-sk/module1';
          
          export class Component1 {
            private testComponent = new TestComponent();
          }
        `
      },
      {
        path: path.join(module2SrcPath, 'component2.ts'),
        content: `
          import { TestComponent } from '@kros-sk/module1';
          import { OtherComponent } from '@kros-sk/module2';
          
          export class Component2 {
            private testComponent = new TestComponent();
            private otherComponent = new OtherComponent();
          }
        `
      },
      {
        path: path.join(module1SrcPath, 'with-renamed-import.ts'),
        content: `
          import { TestComponent as RenamedComponent } from '@kros-sk/module1';
          
          export class WithRenamedImport {
            private component = new RenamedComponent();
          }
        `
      }
    ];
    
    // Write the files
    for (const file of files) {
      fs.writeFileSync(file.path, file.content);
    }
    
    // Initialize ts-morph project
    project = new Project();
    for (const file of files) {
      project.addSourceFileAtPath(file.path);
    }
  });
  
  suiteTeardown(() => {
    // Clean up the temporary directory
    if (fs.existsSync(tempWorkspacePath)) {
      fs.rmdirSync(tempWorkspacePath, { recursive: true });
    }
  });
  
  // Mock the updateImports function
  async function mockUpdateImports(sourceFiles: SourceFile[], exportedNames: string[], oldModule: string, newModule: string): Promise<void> {
    for (const sourceFile of sourceFiles) {
      let needsSaving = false;
      
      // Find imports from the old module
      const importDeclarations = sourceFile.getImportDeclarations();
      
      for (const importDecl of importDeclarations) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        
        // Check if this import is from the old module
        if (moduleSpecifier === oldModule) {
          // Get all named imports
          const namedImports = importDecl.getNamedImports();
          
          // Check if any named imports import the exported names
          for (const namedImport of namedImports) {
            const importName = namedImport.getName();
            
            if (exportedNames.includes(importName)) {
              // Update the module specifier
              importDecl.setModuleSpecifier(newModule);
              needsSaving = true;
              break;
            }
          }
        }
      }
      
      if (needsSaving) {
        // Save the file
        sourceFile.saveSync();
      }
    }
  }
  
  test('Should update imports when moving files between modules', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    // Update imports in all source files
    await mockUpdateImports(project.getSourceFiles(), exportedNames, oldModule, newModule);
    
    // Check if files were updated correctly
    const component1Source = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module1', 'src', 'component1.ts'), 'utf8');
    const component2Source = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module2', 'src', 'component2.ts'), 'utf8');
    const renamedImportSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module1', 'src', 'with-renamed-import.ts'), 'utf8');
    
    // Check that imports were updated
    assert.ok(component1Source.includes(`from '@kros-sk/module2'`), 'Import should be updated in component1.ts');
    assert.ok(component2Source.includes(`from '@kros-sk/module2'`), 'Import should be updated in component2.ts');
    assert.ok(renamedImportSource.includes(`from '@kros-sk/module2'`), 'Import should be updated in with-renamed-import.ts');
    
    // Check that other imports remain untouched
    assert.ok(component2Source.includes(`import { OtherComponent } from '@kros-sk/module2'`), 'Other imports should remain unchanged');
  });
}); 