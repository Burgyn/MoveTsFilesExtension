# Move TS Files Extension

A VS Code extension that helps you move TypeScript files across modules in an Angular monorepo while automatically updating all imports.

## Features

- Move TypeScript files between modules with a right-click context menu
- Automatically updates all import statements across the entire workspace
- Handles both single-line and multi-line import statements
- Preserves existing imports while adding new ones
- Works with complex import statements

## Usage

1. Right-click on any TypeScript file in the VS Code explorer
2. Select "Move TypeScript File and Update Imports"
3. Enter the target module name (e.g., 'kros-auth')
4. The extension will:
   - Move the file to the new location
   - Update all import statements across the workspace
   - Handle complex import statements by splitting them appropriately

## Example

When moving `application-type.model.ts` from `kros-models` to `kros-auth`:

Before:
```typescript
import {
  ApplicationType,
  appSelectorItems,
  getDefaultTranslationCulture,
  KrosCompany,
  TrackInvoicingLoadDurationEventName,
} from '@kros-sk/models';
```

After:
```typescript
import {
  appSelectorItems,
  getDefaultTranslationCulture,
  KrosCompany,
  TrackInvoicingLoadDurationEventName,
} from '@kros-sk/models';
import { ApplicationType } from '@kros-sk/kros-auth';
```

## Requirements

- VS Code 1.85.0 or higher
- TypeScript project with module-based imports

## Extension Settings

This extension doesn't add any settings.

## Known Issues

- Currently only supports moving files within the `src` directory
- Assumes a specific import format (`@kros-sk/module-name`)

## Release Notes

### 0.0.1

Initial release of Move TS Files Extension 