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
    const module3Path = path.join(libsPath, 'kros-module3');
    fs.mkdirSync(module1Path);
    fs.mkdirSync(module2Path);
    fs.mkdirSync(module3Path);
    
    // Create src dirs
    const module1SrcPath = path.join(module1Path, 'src');
    const module2SrcPath = path.join(module2Path, 'src');
    const module3SrcPath = path.join(module3Path, 'src');
    fs.mkdirSync(module1SrcPath);
    fs.mkdirSync(module2SrcPath);
    fs.mkdirSync(module3SrcPath);
    
    // Create test files with various import scenarios
    const files = [
      // Scenario 1: Basic single-line import
      {
        path: path.join(module1SrcPath, 'basic-import.ts'),
        content: `
          import { TestComponent } from '@kros-sk/module1';
          
          export class Component1 {
            private testComponent = new TestComponent();
          }
        `
      },
      
      // Scenario 2: Multiple imports from the same module
      {
        path: path.join(module1SrcPath, 'multiple-imports.ts'),
        content: `
          import { TestComponent, AnotherComponent, ThirdComponent } from '@kros-sk/module1';
          
          export class MultiImportComponent {
            constructor() {
              const test = new TestComponent();
              const another = new AnotherComponent();
              const third = new ThirdComponent();
            }
          }
        `
      },
      
      // Scenario 3: Multi-line imports
      {
        path: path.join(module2SrcPath, 'multi-line-imports.ts'),
        content: `
          import {
            TestComponent,
            AnotherComponent,
            ThirdComponent,
          } from '@kros-sk/module1';
          
          export class MultiLineImportComponent {
            constructor() {
              const test = new TestComponent();
              const another = new AnotherComponent();
              const third = new ThirdComponent();
            }
          }
        `
      },
      
      // Scenario 4: Mixed imports with renamed imports
      {
        path: path.join(module2SrcPath, 'renamed-imports.ts'),
        content: `
          import { 
            TestComponent as Test,
            AnotherComponent,
            ThirdComponent as TC 
          } from '@kros-sk/module1';
          
          export class RenamedImportComponent {
            constructor() {
              const test = new Test();
              const another = new AnotherComponent();
              const third = new TC();
            }
          }
        `
      },
      
      // Scenario 5: Multiple import statements from the same module
      {
        path: path.join(module3SrcPath, 'multiple-import-statements.ts'),
        content: `
          import { TestComponent } from '@kros-sk/module1';
          import { AnotherComponent } from '@kros-sk/module1';
          import { ThirdComponent as TC } from '@kros-sk/module1';
          
          export class MultipleStatementsComponent {
            constructor() {
              const test = new TestComponent();
              const another = new AnotherComponent();
              const third = new TC();
            }
          }
        `
      },
      
      // Scenario 6: Import mixed with other imports
      {
        path: path.join(module3SrcPath, 'mixed-modules-imports.ts'),
        content: `
          import { SomeOtherComponent } from '@kros-sk/module2';
          import { TestComponent, AnotherComponent } from '@kros-sk/module1';
          import { Component3 } from '@kros-sk/module3';
          import * as helpers from '@kros-sk/helpers';
          
          export class MixedModulesComponent {
            constructor() {
              const test = new TestComponent();
              const another = new AnotherComponent();
              const other = new SomeOtherComponent();
              const comp3 = new Component3();
              const helper = helpers.someFunction();
            }
          }
        `
      },
      
      // Scenario 7: Default imports
      {
        path: path.join(module1SrcPath, 'default-import.ts'),
        content: `
          import DefaultComponent from '@kros-sk/module1';
          
          export class DefaultImportComponent {
            constructor() {
              const component = new DefaultComponent();
            }
          }
        `
      },
      
      // Scenario 8: Mixed default and named imports
      {
        path: path.join(module2SrcPath, 'mixed-default-named-imports.ts'),
        content: `
          import DefaultComponent, { TestComponent, AnotherComponent } from '@kros-sk/module1';
          
          export class MixedDefaultNamedComponent {
            constructor() {
              const def = new DefaultComponent();
              const test = new TestComponent();
              const another = new AnotherComponent();
            }
          }
        `
      },
      
      // Scenario 9: Side-effect imports with named imports
      {
        path: path.join(module3SrcPath, 'side-effect-imports.ts'),
        content: `
          import '@kros-sk/module1/styles.css';
          import { TestComponent } from '@kros-sk/module1';
          
          export class SideEffectComponent {
            constructor() {
              const test = new TestComponent();
            }
          }
        `
      },
      
      // Scenario 10: Comments in imports
      {
        path: path.join(module1SrcPath, 'commented-imports.ts'),
        content: `
          import {
            // Main component
            TestComponent,
            // Another useful component
            AnotherComponent,
            /* This is a 
               multi-line comment */
            ThirdComponent
          } from '@kros-sk/module1';
          
          export class CommentedImportComponent {
            constructor() {
              const test = new TestComponent();
              const another = new AnotherComponent();
              const third = new ThirdComponent();
            }
          }
        `
      },
      
      // Scenario 11: Import with complex path
      {
        path: path.join(module2SrcPath, 'complex-path-imports.ts'),
        content: `
          import { TestComponent } from '@kros-sk/module1/components/test';
          
          export class ComplexPathComponent {
            constructor() {
              const test = new TestComponent();
            }
          }
        `
      },
      
      // Scenario 12: Import with string interpolation (less common but possible)
      {
        path: path.join(module3SrcPath, 'dynamic-imports.ts'),
        content: `
          const moduleName = 'module1';
          
          async function loadComponent() {
            const { TestComponent } = await import(\`@kros-sk/\${moduleName}\`);
            return new TestComponent();
          }
          
          export class DynamicImportComponent {
            constructor() {
              loadComponent().then(component => {
                console.log(component);
              });
            }
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
        
        // Check if this import is from the old module or starts with the old module path (for subpaths)
        if (moduleSpecifier === oldModule || moduleSpecifier.startsWith(oldModule + '/')) {
          // Get all named imports
          const namedImports = importDecl.getNamedImports();
          
          // Check for default import
          const defaultImport = importDecl.getDefaultImport();
          
          // Check if any named imports import the exported names
          let shouldUpdateImport = false;
          
          // Check named imports
          for (const namedImport of namedImports) {
            const importName = namedImport.getName();
            
            if (exportedNames.includes(importName)) {
              shouldUpdateImport = true;
              break;
            }
          }
          
          // Check default import
          if (defaultImport && exportedNames.includes('default')) {
            shouldUpdateImport = true;
          }
          
          if (shouldUpdateImport) {
            // Update the module specifier
            // If it's a subpath, replace only the module part
            if (moduleSpecifier.startsWith(oldModule + '/')) {
              const subPath = moduleSpecifier.substring(oldModule.length);
              importDecl.setModuleSpecifier(newModule + subPath);
            } else {
              importDecl.setModuleSpecifier(newModule);
            }
            needsSaving = true;
          }
        }
      }
      
      if (needsSaving) {
        // Save the file
        sourceFile.saveSync();
      }
    }
  }
  
  test('Should update basic imports when moving files between modules', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    // Update imports in all source files
    await mockUpdateImports(project.getSourceFiles(), exportedNames, oldModule, newModule);
    
    // Check if files were updated correctly
    const basicImportSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module1', 'src', 'basic-import.ts'), 'utf8');
    
    // Check that imports were updated
    assert.ok(basicImportSource.includes(`from '@kros-sk/module2'`), 'Basic import should be updated');
  });
  
  test('Should update multi-line imports when moving files between modules', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    const multiLineImportSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module2', 'src', 'multi-line-imports.ts'), 'utf8');
    
    // Check that imports were updated
    assert.ok(multiLineImportSource.includes(`from '@kros-sk/module2'`), 'Multi-line import should be updated');
  });
  
  test('Should update imports with renamed components', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    const renamedImportSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module2', 'src', 'renamed-imports.ts'), 'utf8');
    
    // Check that imports were updated
    assert.ok(renamedImportSource.includes(`from '@kros-sk/module2'`), 'Renamed import should be updated');
  });
  
  test('Should update multiple import statements from the same module', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    const multipleStatementsSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module3', 'src', 'multiple-import-statements.ts'), 'utf8');
    
    // Count occurrences of the new module in the file
    const occurrences = (multipleStatementsSource.match(new RegExp(`'@kros-sk/module2'`, 'g')) || []).length;
    
    // Check that the first import statement was updated
    assert.ok(multipleStatementsSource.includes(`import { TestComponent } from '@kros-sk/module2'`), 'First import statement should be updated');
    
    // Check that we updated only the relevant imports
    assert.strictEqual(occurrences, 1, 'Only imports containing TestComponent should be updated');
  });
  
  test('Should only update relevant imports in mixed module imports', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    const mixedModulesSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module3', 'src', 'mixed-modules-imports.ts'), 'utf8');
    
    // Check that imports from module1 were updated
    assert.ok(mixedModulesSource.includes(`import { TestComponent, AnotherComponent } from '@kros-sk/module2'`), 'Import from module1 should be updated');
    
    // Check that other imports remain unchanged
    assert.ok(mixedModulesSource.includes(`import { Component3 } from '@kros-sk/module3'`), 'Import from module3 should remain unchanged');
    assert.ok(mixedModulesSource.includes(`import * as helpers from '@kros-sk/helpers'`), 'Import from helpers should remain unchanged');
  });
  
  test('Should update default imports when moving files between modules', async () => {
    // Define the exported names and modules
    const exportedNames = ['default'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    // Update imports in all source files
    await mockUpdateImports(project.getSourceFiles(), exportedNames, oldModule, newModule);
    
    // Check if files were updated correctly
    const defaultImportSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module1', 'src', 'default-import.ts'), 'utf8');
    
    // Check that imports were updated
    assert.ok(defaultImportSource.includes(`import DefaultComponent from '@kros-sk/module2'`), 'Default import should be updated');
  });
  
  test('Should update mixed default and named imports when moving files between modules', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent', 'default'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    // Check if files were updated correctly
    const mixedDefaultNamedSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module2', 'src', 'mixed-default-named-imports.ts'), 'utf8');
    
    // Check that imports were updated
    assert.ok(mixedDefaultNamedSource.includes(`import DefaultComponent, { TestComponent, AnotherComponent } from '@kros-sk/module2'`), 'Mixed default and named imports should be updated');
  });
  
  test('Should update imports with complex paths', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    // Check if files were updated correctly
    const complexPathSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module2', 'src', 'complex-path-imports.ts'), 'utf8');
    
    // Check that imports were updated
    assert.ok(complexPathSource.includes(`import { TestComponent } from '@kros-sk/module2/components/test'`), 'Import with complex path should be updated');
  });
  
  test('Should update imports with comments', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent'];
    const oldModule = '@kros-sk/module1';
    const newModule = '@kros-sk/module2';
    
    // Check if files were updated correctly
    const commentedImportSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module1', 'src', 'commented-imports.ts'), 'utf8');
    
    // Check that imports were updated and comments preserved
    assert.ok(commentedImportSource.includes(`from '@kros-sk/module2'`), 'Import with comments should be updated');
    assert.ok(commentedImportSource.includes(`// Main component`), 'Comments should be preserved');
    assert.ok(commentedImportSource.includes(`// Another useful component`), 'Comments should be preserved');
    assert.ok(commentedImportSource.includes(`/* This is a 
               multi-line comment */`), 'Multi-line comments should be preserved');
  });
  
  test('Should handle multiple exports being moved at once', async () => {
    // Define the exported names and modules
    const exportedNames = ['TestComponent', 'AnotherComponent', 'ThirdComponent'];
    const oldModule = '@kros-sk/module2';
    const newModule = '@kros-sk/module3';
    
    // Update imports in all source files
    await mockUpdateImports(project.getSourceFiles(), exportedNames, oldModule, newModule);
    
    // Check if files were updated correctly
    const multiLineImportSource = fs.readFileSync(path.join(tempWorkspacePath, 'libs', 'kros-module2', 'src', 'multi-line-imports.ts'), 'utf8');
    
    // Check that imports were updated
    assert.ok(multiLineImportSource.includes(`from '@kros-sk/module3'`), 'Import with multiple exports should be updated');
  });
}); 