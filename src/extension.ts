import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import {
  ClassDeclaration,
  EnumDeclaration,
  FunctionDeclaration,
  ImportDeclaration,
  ImportSpecifier,
  InterfaceDeclaration,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
  TypeAliasDeclaration,
  VariableDeclaration
} from 'ts-morph';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('move-ts-files.moveFile', async (uri: vscode.Uri) => {
        try {
            if (!uri) {
                vscode.window.showErrorMessage('No file selected');
                return;
            }

            const sourceFile = uri.fsPath;
            if (!sourceFile.endsWith('.ts')) {
                vscode.window.showErrorMessage('Selected file is not a TypeScript file');
                return;
            }

            // Get the workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Get relative path from workspace root
            const relativePath = path.relative(workspaceRoot, sourceFile);
            
            // Ask for the target relative path
            const targetRelativePath = await vscode.window.showInputBox({
                prompt: 'Enter target relative path (e.g., libs/kros-auth/src/lib/base/application-type.model.ts)',
                value: relativePath
            });

            if (!targetRelativePath) {
                return;
            }

            // Try to detect old and new module names from paths
            const oldModuleMatch = relativePath.match(/libs\/([^\/]+)/);
            const newModuleMatch = targetRelativePath.match(/libs\/([^\/]+)/);
            
            let oldModulePath = oldModuleMatch ? oldModuleMatch[1] : '';
            let newModulePath = newModuleMatch ? newModuleMatch[1] : '';

            // Ask for the module names with @kros-sk prefix
            const oldModule = await vscode.window.showInputBox({
                prompt: 'Enter source module name with @kros-sk prefix (e.g., @kros-sk/models)',
                value: oldModulePath ? `@kros-sk/${oldModulePath.replace('kros-', '')}` : ''
            }) || '';

            const newModule = await vscode.window.showInputBox({
                prompt: 'Enter target module name with @kros-sk prefix (e.g., @kros-sk/auth)',
                value: newModulePath ? `@kros-sk/${newModulePath.replace('kros-', '')}` : ''
            }) || '';

            if (!oldModule || !newModule) {
                vscode.window.showErrorMessage('Module names are required');
                return;
            }

            // Initialize ts-morph project
            const project = new Project();
            
            // Add the source file to find exported names
            const sourceFilePath = path.relative(workspaceRoot, sourceFile);
            const tsSourceFile = project.addSourceFileAtPath(sourceFile);
            
            // Find all exported names in the source file
            const exportedNames = findExportedNames(tsSourceFile);
            
            if (exportedNames.length === 0) {
                vscode.window.showErrorMessage('No exported types or classes found in the source file');
                return;
            }

            console.log(`Found exported names: ${exportedNames.join(', ')}`);

            // Construct target path
            const targetPath = path.join(workspaceRoot, targetRelativePath);

            // Log the move operation
            vscode.window.showInformationMessage(`Moving file from ${relativePath} to ${targetRelativePath}`);
            console.log(`Moving file from ${relativePath} to ${targetRelativePath}`);
            console.log(`Old module: ${oldModule}, New module: ${newModule}`);
            console.log(`Exported names: ${exportedNames.join(', ')}`);

            // Create target directory if it doesn't exist
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
                console.log(`Created target directory: ${targetDir}`);
            }

            // Move the file
            await vscode.workspace.fs.rename(uri, vscode.Uri.file(targetPath));
            console.log(`File moved successfully`);

            // Update imports in all TypeScript files
            await updateImports(workspaceRoot, exportedNames, oldModule, newModule);

            vscode.window.showInformationMessage(`File moved and imports updated successfully`);
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
            console.error(`Error: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
}

function findExportedNames(sourceFile: SourceFile): string[] {
    const exportedNames: string[] = [];
    
    // Find exported classes
    sourceFile.getClasses().forEach((classDeclaration: ClassDeclaration) => {
        if (classDeclaration.isExported()) {
            exportedNames.push(classDeclaration.getName() || '');
        }
    });
    
    // Find exported interfaces
    sourceFile.getInterfaces().forEach((interfaceDeclaration: InterfaceDeclaration) => {
        if (interfaceDeclaration.isExported()) {
            exportedNames.push(interfaceDeclaration.getName() || '');
        }
    });
    
    // Find exported enums
    sourceFile.getEnums().forEach((enumDeclaration: EnumDeclaration) => {
        if (enumDeclaration.isExported()) {
            exportedNames.push(enumDeclaration.getName() || '');
        }
    });
    
    // Find exported type aliases
    sourceFile.getTypeAliases().forEach((typeAlias: TypeAliasDeclaration) => {
        if (typeAlias.isExported()) {
            exportedNames.push(typeAlias.getName() || '');
        }
    });
    
    // Find exported functions
    sourceFile.getFunctions().forEach((func: FunctionDeclaration) => {
        if (func.isExported()) {
            exportedNames.push(func.getName() || '');
        }
    });
    
    // Find exported variables
    sourceFile.getVariableDeclarations().forEach((variable: VariableDeclaration) => {
        if (variable.isExported()) {
            exportedNames.push(variable.getName() || '');
        }
    });
    
    return exportedNames.filter(name => name !== '');
}

async function updateImports(workspaceRoot: string, exportedNames: string[], oldModule: string, newModule: string): Promise<void> {
    // Try to use tsconfig.json if it exists
    let projectOptions: any = {
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true
    };
    
    // Check if tsconfig.json exists
    const tsConfigPath = path.join(workspaceRoot, 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
        projectOptions.tsConfigFilePath = tsConfigPath;
    }
    
    // Initialize a project for handling imports
    const project = new Project(projectOptions);
    
    // Find all TypeScript files in the workspace
    const files = await vscode.workspace.findFiles('**/*.ts');
    console.log(`Found ${files.length} TypeScript files to scan for imports`);
    
    let filesUpdated = 0;
    let importsUpdated = 0;
    
    for (const file of files) {
        const filePath = file.fsPath;
        
        try {
            // Add the file to the project
            const sourceFile = project.addSourceFileAtPath(filePath);
            
            // Get all import declarations in the file
            const importDeclarations = sourceFile.getImportDeclarations();
            
            let fileUpdated = false;
            
            // Check each import declaration
            for (const importDecl of importDeclarations) {
                const moduleSpecifier = importDecl.getModuleSpecifierValue();
                
                // If the import is from the old module
                if (moduleSpecifier === oldModule) {
                    const namedImports = importDecl.getNamedImports();
                    const movedImports: string[] = [];
                    
                    // Check if any of the named imports match the exported names
                    for (const namedImport of namedImports) {
                        const importName = namedImport.getName();
                        if (exportedNames.includes(importName)) {
                            movedImports.push(importName);
                        }
                    }
                    
                    if (movedImports.length > 0) {
                        console.log(`Found imports of ${movedImports.join(', ')} in ${path.relative(workspaceRoot, filePath)}`);
                        
                        // Remove the moved imports from the original import declaration
                        for (const movedImport of movedImports) {
                            const namedImport = importDecl.getNamedImports().find((ni: ImportSpecifier) => ni.getName() === movedImport);
                            if (namedImport) {
                                namedImport.remove();
                            }
                        }
                        
                        // If there are no more imports from the old module, remove the entire import declaration
                        if (importDecl.getNamedImports().length === 0) {
                            importDecl.remove();
                        }
                        
                        // Add a new import declaration for the moved imports
                        sourceFile.addImportDeclaration({
                            moduleSpecifier: newModule,
                            namedImports: movedImports.map(name => ({ name }))
                        });
                        
                        fileUpdated = true;
                        importsUpdated += movedImports.length;
                    }
                }
            }
            
            // Save the changes if the file was updated
            if (fileUpdated) {
                sourceFile.saveSync();
                filesUpdated++;
                console.log(`Updated imports in ${path.relative(workspaceRoot, filePath)}`);
            }
        } catch (error) {
            console.error(`Error processing file ${filePath}: ${error}`);
        }
    }
    
    console.log(`Update complete: Modified ${filesUpdated} files, updated ${importsUpdated} imports`);
}

export function deactivate() {} 