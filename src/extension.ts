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
            
            // Show UI panel to collect all information
            const panel = vscode.window.createWebviewPanel(
                'moveTsForm',
                'Move TypeScript File',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );

            // Find available modules
            const modules = await findAvailableModules(workspaceRoot);
            
            // Set the HTML content of the webview
            panel.webview.html = getWebviewContent(relativePath, modules);
            
            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'moveFile':
                            // Close the panel
                            panel.dispose();
                            
                            // Process the form data
                            const targetRelativePath = message.targetPath;
                            const oldModule = message.sourceModule;
                            const newModule = message.targetModule;
                            
                            // Initialize ts-morph project
                            const project = new Project();
                            
                            // Add the source file to find exported names
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
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
            console.error(`Error: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * Gets the HTML content for the webview
 */
function getWebviewContent(relativePath: string, modules: string[]): string {
    const moduleOptions = modules.map(mod => `<option value="@kros-sk/${mod}">${mod}</option>`).join('\n');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Move TypeScript File</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
        }
        input, select {
            width: 100%;
            padding: 8px;
            box-sizing: border-box;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            cursor: pointer;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <h2>Move TypeScript File</h2>
    <div class="form-group">
        <label for="currentPath">Current Path:</label>
        <input type="text" id="currentPath" value="${relativePath}" readonly>
    </div>
    <div class="form-group">
        <label for="targetPath">Target Path:</label>
        <input type="text" id="targetPath" value="${relativePath}">
    </div>
    <div class="form-group">
        <label for="sourceModule">Source Module:</label>
        <select id="sourceModule">
            ${moduleOptions}
        </select>
    </div>
    <div class="form-group">
        <label for="targetModule">Target Module:</label>
        <select id="targetModule">
            ${moduleOptions}
        </select>
    </div>
    <button id="moveButton">Move and Update Imports</button>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Try to detect source module from path
        const currentPath = document.getElementById('currentPath').value;
        const sourceModuleSelect = document.getElementById('sourceModule');
        const targetPathInput = document.getElementById('targetPath');
        const targetModuleSelect = document.getElementById('targetModule');
        
        // Initialize source module based on path
        const moduleMatch = currentPath.match(/libs\\/([^\\\\]+)/);
        if (moduleMatch && moduleMatch[1]) {
            const moduleName = moduleMatch[1].replace('kros-', '');
            
            // Select the matching option
            Array.from(sourceModuleSelect.options).forEach(option => {
                if (option.text === moduleName) {
                    option.selected = true;
                }
            });
        }
        
        // Update target module when target path changes
        targetPathInput.addEventListener('input', function() {
            const targetPath = this.value;
            const targetModuleMatch = targetPath.match(/libs\\/([^\\\\]+)/);
            
            if (targetModuleMatch && targetModuleMatch[1]) {
                const targetModuleName = targetModuleMatch[1].replace('kros-', '');
                
                // Select the matching option
                Array.from(targetModuleSelect.options).forEach(option => {
                    if (option.text === targetModuleName) {
                        option.selected = true;
                    }
                });
            }
        });
        
        // Handle form submission
        document.getElementById('moveButton').addEventListener('click', () => {
            vscode.postMessage({
                command: 'moveFile',
                targetPath: document.getElementById('targetPath').value,
                sourceModule: document.getElementById('sourceModule').value,
                targetModule: document.getElementById('targetModule').value
            });
        });
    </script>
</body>
</html>`;
}

/**
 * Finds available modules in the workspace
 */
async function findAvailableModules(workspaceRoot: string): Promise<string[]> {
    const modules: string[] = [];
    
    try {
        const libsPath = path.join(workspaceRoot, 'libs');
        
        // Check if libs directory exists
        if (fs.existsSync(libsPath)) {
            const entries = fs.readdirSync(libsPath, { withFileTypes: true });
            
            // Filter directories
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    // Extract module name without 'kros-' prefix
                    const moduleName = entry.name.replace('kros-', '');
                    modules.push(moduleName);
                }
            }
        }
    } catch (error) {
        console.error(`Error finding modules: ${error}`);
    }
    
    return modules;
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